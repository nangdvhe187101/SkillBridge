using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Chat;

namespace SkillBridge.Application.Interfaces.Chat;

public interface IChatRealtimeNotifier
{
    Task NotifyNewMessageAsync(int conversationId, int receiverUserId, ChatMessageDto message, CancellationToken ct = default);
    Task NotifyConversationUpdatedAsync(int conversationId, int receiverUserId, ConversationDto conversation, CancellationToken ct = default);
    Task NotifyConversationReadAsync(int conversationId, int readerUserId, int partnerUserId, CancellationToken ct = default);
}
