using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Chat;
using SkillBridge.Application.Interfaces.Chat;

namespace SkillBridge.AdminAPI.Services;

public class NullChatRealtimeNotifier : IChatRealtimeNotifier
{
    public Task NotifyNewMessageAsync(int conversationId, int receiverUserId, ChatMessageDto message, CancellationToken ct = default)
    {
        return Task.CompletedTask;
    }

    public Task NotifyConversationUpdatedAsync(int conversationId, int receiverUserId, ConversationDto conversation, CancellationToken ct = default)
    {
        return Task.CompletedTask;
    }

    public Task NotifyConversationReadAsync(int conversationId, int readerUserId, int partnerUserId, CancellationToken ct = default)
    {
        return Task.CompletedTask;
    }
}
