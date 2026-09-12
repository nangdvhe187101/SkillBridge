using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using SkillBridge.API.Hubs;
using SkillBridge.Application.DTOs.Payments;
using SkillBridge.Application.Interfaces.Payments;

namespace SkillBridge.API.Services;

public class SignalRPaymentRealtimeService : IPaymentRealtimeNotifier
{
    private readonly IHubContext<PaymentHub> _hubContext;
    private readonly ILogger<SignalRPaymentRealtimeService> _logger;

    public SignalRPaymentRealtimeService(
        IHubContext<PaymentHub> hubContext,
        ILogger<SignalRPaymentRealtimeService> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task NotifyPaymentSuccessAsync(string orderCode, PaymentOrderStatusDto status, CancellationToken ct = default)
    {
        try
        {
            var groupName = $"order_{orderCode}";
            _logger.LogInformation("SignalR: Phát thông báo PaymentSuccess tới channel {Group}", groupName);
            await _hubContext.Clients.Group(groupName).SendAsync("PaymentSuccess", status, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi phát sự kiện SignalR PaymentSuccess cho đơn {OrderCode}", orderCode);
        }
    }
}
