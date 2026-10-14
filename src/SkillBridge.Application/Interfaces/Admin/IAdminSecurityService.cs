using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Admin;

namespace SkillBridge.Application.Interfaces.Admin;

public interface IAdminSecurityService
{
    Task<AdminLoginHistoryPagedResultDto> GetLoginHistoryAsync(
        string? role,
        string? searchTerm,
        int page,
        int pageSize,
        CancellationToken ct = default);

    Task<AdminLoginStatsDto> GetLoginStatsAsync(CancellationToken ct = default);

    Task RecordLoginEventAsync(
        int userId,
        string action,
        string? ipAddress,
        string? userAgent,
        string method,
        CancellationToken ct = default);
}
