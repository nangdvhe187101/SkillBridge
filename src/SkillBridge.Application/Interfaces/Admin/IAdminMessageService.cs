using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Admin;

namespace SkillBridge.Application.Interfaces.Admin;

public interface IAdminMessageService
{
    Task<AdminConversationPagedResultDto> GetConversationsAsync(
        string? query = null,
        string? status = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken ct = default);

    Task<AdminConversationDetailDto> GetConversationDetailAsync(
        int adminUserId,
        int conversationId,
        CancellationToken ct = default);

    Task<bool> WarnConversationAsync(
        int adminUserId,
        int conversationId,
        AdminWarnChatDto? dto = null,
        CancellationToken ct = default);

    Task<bool> LockConversationAsync(
        int adminUserId,
        int conversationId,
        AdminLockChatDto? dto = null,
        CancellationToken ct = default);

    Task<int> SendBroadcastAsync(
        int adminUserId,
        AdminBroadcastDto dto,
        CancellationToken ct = default);
}
