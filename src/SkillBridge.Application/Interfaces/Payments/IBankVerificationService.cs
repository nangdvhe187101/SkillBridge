using System.IO;
using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Payments;

namespace SkillBridge.Application.Interfaces.Payments;

public interface IBankVerificationService
{
    Task<BankVerificationResponseDto> CreateRequestAsync(int userId, CreateBankVerificationDto dto, string? ipAddress = null, CancellationToken ct = default);
    Task<DecodeQrResponseDto> DecodeQrImageAsync(Stream stream, string fileName, CancellationToken ct = default);
    Task<BankVerificationResponseDto> CancelRequestAsync(int userId, int requestId, CancellationToken ct = default);
    Task<BankVerificationResponseDto?> GetCurrentVerificationAsync(int userId, CancellationToken ct = default);
    Task<BankVerificationPagedResultDto<AdminBankVerificationItemDto>> GetAdminListAsync(string? status, int page, int pageSize, CancellationToken ct = default);
    Task<AdminBankVerificationDetailDto> GetAdminDetailAsync(int requestId, CancellationToken ct = default);
    Task<BankVerificationResponseDto> ApproveRequestAsync(int adminUserId, int requestId, AdminApproveBankVerificationDto dto, CancellationToken ct = default);
    Task<BankVerificationResponseDto> RejectRequestAsync(int adminUserId, int requestId, AdminRejectBankVerificationDto dto, CancellationToken ct = default);
}
