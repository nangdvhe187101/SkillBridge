using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Chat;
using SkillBridge.Application.DTOs.Jobs;

namespace SkillBridge.Application.Interfaces.Chat;

public interface IChatService
{
    Task<List<ConversationDto>> GetConversationsAsync(int currentUserId, string? tab = null, CancellationToken ct = default);

    Task<PagedResult<ChatMessageDto>> GetMessagesAsync(int currentUserId, int conversationId, int page, int pageSize, CancellationToken ct = default);

    Task<ConversationDto> GetOrCreateConversationAsync(int currentUserId, StartConversationRequestDto request, CancellationToken ct = default);

    Task<ChatMessageDto> SendMessageAsync(int currentUserId, int conversationId, SendMessageRequestDto request, CancellationToken ct = default);

    Task MarkAsReadAsync(int currentUserId, int conversationId, CancellationToken ct = default);

    Task ToggleArchiveConversationAsync(int currentUserId, int conversationId, bool archive, CancellationToken ct = default);

    Task AcceptMessageRequestAsync(int currentUserId, int conversationId, CancellationToken ct = default);

    Task DeclineMessageRequestAsync(int currentUserId, int conversationId, CancellationToken ct = default);

    Task<ChatMessageAttachmentDto> UploadAttachmentAsync(
        int currentUserId,
        int conversationId,
        System.IO.Stream stream,
        string fileName,
        string contentType,
        long fileSize,
        CancellationToken ct = default);

    Task ReportConversationAsync(
        int currentUserId,
        int conversationId,
        ReportConversationRequestDto request,
        CancellationToken ct = default);

    Task<ConversationDto> StartSupportConversationAsync(int currentUserId, CancellationToken ct = default);
}
