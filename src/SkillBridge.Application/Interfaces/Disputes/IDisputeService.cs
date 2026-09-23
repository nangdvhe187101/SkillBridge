using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Disputes;

namespace SkillBridge.Application.Interfaces.Disputes;

public interface IDisputeService
{
    /// <summary>
    /// Sinh viên hoặc Nhà tuyển dụng gửi yêu cầu mở khiếu nại tranh chấp cho công việc
    /// </summary>
    Task<DisputeDto> CreateDisputeAsync(int userId, CreateDisputeRequest request, CancellationToken ct = default);

    /// <summary>
    /// Các bên trong tranh chấp nộp bổ sung tệp chứng cứ (trong vòng 72 giờ)
    /// </summary>
    Task<DisputeEvidenceDto> AddEvidenceAsync(int userId, int disputeId, AddEvidenceRequest request, CancellationToken ct = default);

    /// <summary>
    /// Lấy danh sách các khiếu nại mà người dùng hiện tại tham gia (với tư cách Sinh viên hoặc NTD)
    /// </summary>
    Task<List<DisputeDto>> GetMyDisputesAsync(int userId, CancellationToken ct = default);

    /// <summary>
    /// Xem chi tiết hồ sơ khiếu nại (kèm danh sách toàn bộ bằng chứng hai bên đã nộp)
    /// </summary>
    Task<DisputeDetailDto> GetDisputeDetailAsync(int userId, int disputeId, CancellationToken ct = default);

    /// <summary>
    /// Quản trị viên / Trọng tài viên truy xuất bằng chứng hội thoại chat
    /// </summary>
    Task<DisputeChatEvidenceDto> GetChatEvidenceAsync(int adminUserId, int disputeId, CancellationToken ct = default);

    /// <summary>
    /// Quản trị viên lấy danh sách toàn bộ các tranh chấp (lọc theo trạng thái)
    /// </summary>
    Task<List<DisputeDto>> GetAdminDisputesAsync(string? status = null, CancellationToken ct = default);

    /// <summary>
    /// Quản trị viên đưa ra phán quyết giải quyết tranh chấp (chấp thuận, bác bỏ, phân chia tỷ lệ)
    /// </summary>
    Task<DisputeDto> ResolveDisputeAsync(int adminUserId, int disputeId, ResolveDisputeRequest request, CancellationToken ct = default);
}
