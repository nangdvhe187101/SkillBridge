using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Chat;
using SkillBridge.Application.DTOs.Jobs;

namespace SkillBridge.Application.Interfaces.Chat;

public interface IChatService
{
    /**
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-001
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-004
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-010
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-012
     */
    Task<List<ConversationDto>> GetConversationsAsync(int currentUserId, string? tab = null, CancellationToken ct = default);

    /**
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-001
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-004
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-008
     */
    Task<PagedResult<ChatMessageDto>> GetMessagesAsync(int currentUserId, int conversationId, int page, int pageSize, CancellationToken ct = default);

    /**
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-002
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-007
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-012
     */
    Task<ConversationDto> GetOrCreateConversationAsync(int currentUserId, StartConversationRequestDto request, CancellationToken ct = default);

    /**
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-001
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-003
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-006
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-008
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-009
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-010
     */
    Task<ChatMessageDto> SendMessageAsync(int currentUserId, int conversationId, SendMessageRequestDto request, CancellationToken ct = default);

    /**
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-001
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-005
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-013
     */
    Task MarkAsReadAsync(int currentUserId, int conversationId, CancellationToken ct = default);

    /**
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-010
     */
    Task ToggleArchiveConversationAsync(int currentUserId, int conversationId, bool archive, CancellationToken ct = default);

    /**
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-012
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-013
     */
    Task AcceptMessageRequestAsync(int currentUserId, int conversationId, CancellationToken ct = default);

    /**
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-012
     */
    Task DeclineMessageRequestAsync(int currentUserId, int conversationId, CancellationToken ct = default);

    /**
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-003
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-006
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-008
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-009
     */
    Task<ChatMessageAttachmentDto> UploadAttachmentAsync(
        int currentUserId,
        int conversationId,
        System.IO.Stream stream,
        string fileName,
        string contentType,
        long fileSize,
        CancellationToken ct = default);
}
