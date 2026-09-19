using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using SkillBridge.API.Hubs;
using SkillBridge.Application.DTOs.Chat;
using SkillBridge.Application.Interfaces.Chat;

namespace SkillBridge.API.Services;

public class SignalRChatRealtimeService : IChatRealtimeNotifier
{
    private readonly IHubContext<ChatHub> _hubContext;
    private readonly ILogger<SignalRChatRealtimeService> _logger;

    public SignalRChatRealtimeService(
        IHubContext<ChatHub> hubContext,
        ILogger<SignalRChatRealtimeService> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task NotifyNewMessageAsync(int conversationId, int receiverUserId, ChatMessageDto message, CancellationToken ct = default)
    {
        try
        {
            var convoGroup = $"conversation_{conversationId}";
            var userGroup = $"user_{receiverUserId}";

            _logger.LogInformation("SignalR: Phát sự kiện ReceiveMessage tới phòng {ConvoGroup} và người nhận {UserGroup}", convoGroup, userGroup);

            // Phát tới room đang mở cuộc trò chuyện
            await _hubContext.Clients.Group(convoGroup).SendAsync("ReceiveMessage", message, ct);

            // Đồng thời phát tới group cá nhân của người nhận (phòng trường hợp người đó chưa bấm vào phòng này)
            await _hubContext.Clients.Group(userGroup).SendAsync("ReceiveMessage", message, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi phát sự kiện SignalR ReceiveMessage cho hội thoại {ConversationId}", conversationId);
        }
    }

    public async Task NotifyConversationUpdatedAsync(int conversationId, int receiverUserId, ConversationDto conversation, CancellationToken ct = default)
    {
        try
        {
            var userGroup = $"user_{receiverUserId}";
            _logger.LogInformation("SignalR: Phát sự kiện ConversationUpdated tới {UserGroup}", userGroup);
            await _hubContext.Clients.Group(userGroup).SendAsync("ConversationUpdated", conversation, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi phát sự kiện SignalR ConversationUpdated cho hội thoại {ConversationId}", conversationId);
        }
    }

    public async Task NotifyConversationReadAsync(int conversationId, int readerUserId, int partnerUserId, CancellationToken ct = default)
    {
        try
        {
            var convoGroup = $"conversation_{conversationId}";
            var partnerGroup = $"user_{partnerUserId}";

            _logger.LogInformation("SignalR: Phát sự kiện ConversationRead cho hội thoại {ConversationId} bởi user {ReaderUserId}", conversationId, readerUserId);

            var payload = new { conversationId, readerUserId };
            await _hubContext.Clients.Group(convoGroup).SendAsync("ConversationRead", payload, ct);
            await _hubContext.Clients.Group(partnerGroup).SendAsync("ConversationRead", payload, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi phát sự kiện SignalR ConversationRead cho hội thoại {ConversationId}", conversationId);
        }
    }
}
