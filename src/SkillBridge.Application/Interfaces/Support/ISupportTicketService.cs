using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Support;

namespace SkillBridge.Application.Interfaces.Support;

/// <summary>
/// Giao diện dịch vụ tiếp nhận và xử lý yêu cầu hỗ trợ / khiếu nại phía người dùng
/// </summary>
public interface ISupportTicketService
{
    /// <summary>
    /// Tạo mới một ticket hỗ trợ từ người dùng đã đăng nhập hoặc khách vãng lai
    /// </summary>
    Task<SupportTicketCreatedResponseDto> CreateTicketAsync(
        CreateSupportTicketDto dto,
        int? authenticatedUserId,
        CancellationToken ct = default);
}
