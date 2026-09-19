using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkillBridge.API.Common;
using SkillBridge.Infrastructure.Data;

using SkillBridge.Application.Interfaces.Chat;

namespace SkillBridge.API.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly SkillBridgeDbContext _dbContext;
    private readonly IUserPresenceService _presenceService;
    private readonly ILogger<ChatHub> _logger;

    public ChatHub(
        SkillBridgeDbContext dbContext,
        IUserPresenceService presenceService,
        ILogger<ChatHub> logger)
    {
        _dbContext = dbContext;
        _presenceService = presenceService;
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.GetCurrentUserId();
        if (userId.HasValue)
        {
            var userGroup = $"user_{userId.Value}";
            await Groups.AddToGroupAsync(Context.ConnectionId, userGroup);

            var justBecameOnline = _presenceService.AddConnection(userId.Value, Context.ConnectionId);
            _logger.LogInformation("ChatHub: Client {ConnectionId} (User {UserId}) kết nối. JustBecameOnline: {Online}", Context.ConnectionId, userId.Value, justBecameOnline);

            if (justBecameOnline)
            {
                await Clients.All.SendAsync("UserStatusChanged", new { userId = userId.Value, isOnline = true });
            }

            var onlineUsers = _presenceService.GetOnlineUserIds();
            await Clients.Caller.SendAsync("OnlineUsersList", onlineUsers);
        }

        await base.OnConnectedAsync();
    }

    public async Task JoinConversation(int conversationId)
    {
        if (conversationId <= 0)
        {
            throw new HubException("Mã hội thoại không hợp lệ.");
        }

        var userId = Context.User?.GetRequiredUserId()
            ?? throw new HubException("Không thể xác thực danh tính người dùng.");

        // Kiểm tra quyền sở hữu hội thoại (Chống IDOR - REQ-CHAT-001)
        var isParticipant = await _dbContext.Conversations
            .AsNoTracking()
            .AnyAsync(c => c.Id == conversationId && (c.UserAId == userId || c.UserBId == userId));

        if (!isParticipant)
        {
            _logger.LogWarning("ChatHub: User {UserId} cố gắng vào group hội thoại {ConversationId} khi không phải thành viên", userId, conversationId);
            throw new HubException("Bạn không có quyền tham gia cuộc hội thoại này.");
        }

        var groupName = $"conversation_{conversationId}";
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        _logger.LogInformation("ChatHub: Client {ConnectionId} (User {UserId}) đã tham gia nhóm {Group}", Context.ConnectionId, userId, groupName);
    }

    public async Task LeaveConversation(int conversationId)
    {
        if (conversationId <= 0) return;

        var groupName = $"conversation_{conversationId}";
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
        _logger.LogInformation("ChatHub: Client {ConnectionId} đã rời nhóm {Group}", Context.ConnectionId, groupName);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.GetCurrentUserId();
        if (userId.HasValue)
        {
            var justBecameOffline = _presenceService.RemoveConnection(userId.Value, Context.ConnectionId);
            _logger.LogInformation("ChatHub: Client {ConnectionId} (User {UserId}) ngắt kết nối. JustBecameOffline: {Offline}", Context.ConnectionId, userId.Value, justBecameOffline);

            if (justBecameOffline)
            {
                await Clients.All.SendAsync("UserStatusChanged", new { userId = userId.Value, isOnline = false });
            }
        }

        await base.OnDisconnectedAsync(exception);
    }
}
