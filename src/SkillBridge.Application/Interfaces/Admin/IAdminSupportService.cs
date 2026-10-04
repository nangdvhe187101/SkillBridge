using System;
using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Admin;

namespace SkillBridge.Application.Interfaces.Admin;

/// <summary>
/// Giao diện dịch vụ Quản trị Hỗ trợ Người dùng (Tickets) & Tra cứu Nhật ký Kiểm toán (Audit Logs)
/// </summary>
public interface IAdminSupportService
{
    /// <summary>
    /// Tra cứu danh sách ticket hỗ trợ người dùng có tìm kiếm, lọc theo trạng thái và phân trang
    /// </summary>
    Task<AdminTicketPagedResultDto> GetTicketsAsync(
        string? searchTerm,
        string? status,
        int page,
        int pageSize,
        CancellationToken ct = default);

    /// <summary>
    /// Lấy thông tin chi tiết một ticket
    /// </summary>
    Task<AdminTicketItemDto?> GetTicketDetailAsync(int ticketId, CancellationToken ct = default);

    /// <summary>
    /// Phản hồi nội dung CSKH tới người dùng và/hoặc đóng ticket hỗ trợ
    /// </summary>
    Task<AdminTicketItemDto> ReplyAndResolveTicketAsync(
        int ticketId,
        int adminUserId,
        AdminResolveTicketDto dto,
        CancellationToken ct = default);

    /// <summary>
    /// Tra cứu nhật ký kiểm toán hệ thống bất biến (INV-SEC-03) có lọc và phân trang
    /// </summary>
    Task<AdminAuditLogPagedResultDto> GetAuditLogsAsync(
        string? searchTerm,
        int? actorId,
        DateTime? fromDate,
        DateTime? toDate,
        int page,
        int pageSize,
        CancellationToken ct = default);
}
