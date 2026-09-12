using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkillBridge.API.Common;
using SkillBridge.Application.DTOs.Payments;
using SkillBridge.Infrastructure.Data;

namespace SkillBridge.API.Hubs;

[Authorize]
public class PaymentHub : Hub
{
    private readonly SkillBridgeDbContext _dbContext;
    private readonly ILogger<PaymentHub> _logger;

    public PaymentHub(SkillBridgeDbContext dbContext, ILogger<PaymentHub> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task SubscribeOrder(string orderCode)
    {
        if (string.IsNullOrWhiteSpace(orderCode))
        {
            throw new HubException("Mã đơn hàng không hợp lệ.");
        }

        var userId = Context.User?.GetRequiredUserId()
            ?? throw new HubException("Không thể xác thực danh tính người dùng.");

        // Kiểm tra quyền sở hữu đơn hàng (Security: Chỉ chủ sở hữu đơn hàng mới được subscribe)
        var order = await _dbContext.PaymentOrders
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.OrderCode == orderCode && o.UserId == userId);

        if (order == null)
        {
            _logger.LogWarning("User {UserId} cố gắng truy cập trái phép channel của đơn hàng {OrderCode}", userId, orderCode);
            throw new HubException("Bạn không có quyền theo dõi đơn hàng này.");
        }

        var groupName = $"order_{orderCode}";
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        _logger.LogInformation("Client {ConnectionId} (User {UserId}) đã tham gia nhóm {Group}", Context.ConnectionId, userId, groupName);

        // Nếu đơn hàng đã hoàn tất trước đó, lập tức phản hồi sự kiện cho client
        if (order.Status == "paid")
        {
            await Clients.Caller.SendAsync("PaymentSuccess", new PaymentOrderStatusDto
            {
                OrderCode = order.OrderCode,
                Provider = order.Provider,
                Status = order.Status,
                Amount = order.Amount,
                ExpiresAt = order.ExpiresAt,
                PaidAt = order.PaidAt
            });
        }
    }

    public async Task UnsubscribeOrder(string orderCode)
    {
        if (string.IsNullOrWhiteSpace(orderCode)) return;

        var groupName = $"order_{orderCode}";
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
        _logger.LogInformation("Client {ConnectionId} đã rời nhóm {Group}", Context.ConnectionId, groupName);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Client {ConnectionId} đã ngắt kết nối SignalR.", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }
}
