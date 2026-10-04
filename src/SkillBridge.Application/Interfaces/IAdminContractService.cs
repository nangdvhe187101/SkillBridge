using System.Collections.Generic;
using System.Threading.Tasks;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Admin;
using SkillBridge.Application.DTOs.Jobs;

namespace SkillBridge.Application.Interfaces;

/// <summary>
/// Service Port quản trị giám sát hợp đồng và cưỡng chế tiền ký quỹ Escrow
/// </summary>
public interface IAdminContractService
{
    /// <summary>
    /// @ears .sdd/features/feat-contract-escrow-monitor/SPEC.md#REQ-CEM-01
    /// </summary>
    Task<AdminContractStatsDto> GetContractStatsAsync();

    /// <summary>
    /// @ears .sdd/features/feat-contract-escrow-monitor/SPEC.md#REQ-CEM-02
    /// </summary>
    Task<PagedResult<AdminContractListItemDto>> GetContractsAsync(
        string? searchTerm,
        string? status,
        int page,
        int pageSize);

    /// <summary>
    /// @ears .sdd/features/feat-contract-escrow-monitor/SPEC.md#REQ-CEM-03
    /// </summary>
    Task<AdminContractDetailDto?> GetContractDetailAsync(int contractId);

    /// <summary>
    /// @ears .sdd/features/feat-contract-escrow-monitor/SPEC.md#REQ-CEM-04
    /// </summary>
    Task<bool> ForceReleaseAsync(int contractId, int adminId, ForceContractActionRequestDto request);

    /// <summary>
    /// @ears .sdd/features/feat-contract-escrow-monitor/SPEC.md#REQ-CEM-05
    /// </summary>
    Task<bool> ForceRefundAsync(int contractId, int adminId, ForceContractActionRequestDto request);

    /// <summary>
    /// @ears .sdd/features/feat-contract-escrow-monitor/SPEC.md#REQ-CEM-06
    /// </summary>
    Task<bool> ApproveCheckerAsync(int contractId, int checkerAdminId);
}
