using System;
using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Admin;

namespace SkillBridge.Application.Interfaces.Admin;

/// <summary>
/// Dịch vụ cho Admin xem và thống kê toàn bộ giao dịch tiền (bảng transactions):
/// nạp tiền, giữ/hoàn tiền rút, hoa hồng, phí gói, quảng cáo, hoàn bảo hiểm, thưởng giới thiệu...
/// Chỉ đọc dữ liệu, không cho sửa số liệu tài chính đã ghi nhận.
/// </summary>
public interface IAdminTransactionService
{
    Task<AdminTransactionPagedResultDto> GetListAsync(
        string? type = null,
        int? userId = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? keyword = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken ct = default);

    Task<AdminTransactionSummaryDto> GetSummaryAsync(
        DateTime? fromDate = null,
        DateTime? toDate = null,
        CancellationToken ct = default);
}
