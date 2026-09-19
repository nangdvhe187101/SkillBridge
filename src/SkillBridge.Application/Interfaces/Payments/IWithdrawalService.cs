using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Payments;

namespace SkillBridge.Application.Interfaces.Payments;

public interface IWithdrawalService
{
    Task<WithdrawalResponseDto> RequestWithdrawalAsync(int userId, CreateWithdrawalDto dto, string? ipAddress = null, CancellationToken ct = default);
    Task<WithdrawalPagedResultDto<WithdrawalResponseDto>> GetMyWithdrawalsAsync(int userId, int page = 1, int pageSize = 20, CancellationToken ct = default);
    Task<WithdrawalPagedResultDto<AdminWithdrawalItemDto>> GetAdminListAsync(string? status, int page = 1, int pageSize = 20, CancellationToken ct = default);
    Task<WithdrawalResponseDto> ApproveWithdrawalAsync(int adminUserId, int withdrawalId, AdminApproveWithdrawalDto? dto = null, CancellationToken ct = default);
    Task<WithdrawalResponseDto> RejectWithdrawalAsync(int adminUserId, int withdrawalId, AdminRejectWithdrawalDto dto, CancellationToken ct = default);
}
