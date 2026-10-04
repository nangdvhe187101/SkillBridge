using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Admin;
using SkillBridge.Application.DTOs.Jobs;

namespace SkillBridge.Application.Interfaces.Admin;

/// <summary>
/// Interface dịch vụ quản trị nội dung sàn, kiểm duyệt tin đăng và ngành nghề
/// </summary>
public interface IAdminContentService
{
    /// <summary>
    /// @ears .sdd/features/admin-management/SPEC.md#REQ-CNT-01
    /// Lấy danh sách tin tuyển dụng trong hàng đợi kiểm duyệt phân trang và lọc theo mức rủi ro
    /// </summary>
    Task<PagedResult<AdminModerationItemDto>> GetModerationQueueAsync(AdminModerationFilterRequest filter, CancellationToken ct = default);

    /// <summary>
    /// @ears .sdd/features/admin-management/SPEC.md#REQ-CNT-02
    /// Lấy thống kê số lượng tin chờ duyệt, tin rủi ro cao, danh mục và yêu cầu tin nổi bật
    /// </summary>
    Task<AdminContentStatsDto> GetContentStatsAsync(CancellationToken ct = default);

    /// <summary>
    /// @ears .sdd/features/admin-management/SPEC.md#REQ-CNT-03
    /// Phê duyệt tin đăng công khai lên sàn tìm việc cho sinh viên
    /// </summary>
    Task<bool> ApproveJobAsync(int adminUserId, int jobId, AdminApproveJobRequest? request, CancellationToken ct = default);

    /// <summary>
    /// @ears .sdd/features/admin-management/SPEC.md#REQ-CNT-04
    /// Từ chối tin đăng vi phạm kèm lý do giải thích cho nhà tuyển dụng
    /// </summary>
    Task<bool> RejectJobAsync(int adminUserId, int jobId, AdminRejectJobRequest request, CancellationToken ct = default);

    /// <summary>
    /// @ears .sdd/features/admin-management/SPEC.md#REQ-CNT-05
    /// Gửi cảnh báo vi phạm liêm chính/chính sách tới nhà tuyển dụng đăng tin
    /// </summary>
    Task<bool> WarnPosterAsync(int adminUserId, int jobId, AdminWarnPosterRequest request, CancellationToken ct = default);

    /// <summary>
    /// @ears .sdd/features/admin-management/SPEC.md#REQ-CNT-06
    /// Lấy danh sách ngành nghề / danh mục toàn sàn
    /// </summary>
    Task<List<AdminCategoryDto>> GetCategoriesAsync(CancellationToken ct = default);

    /// <summary>
    /// @ears .sdd/features/admin-management/SPEC.md#REQ-CNT-07
    /// Tạo mới một danh mục ngành nghề
    /// </summary>
    Task<AdminCategoryDto> CreateCategoryAsync(int adminUserId, AdminCreateCategoryRequest request, CancellationToken ct = default);

    /// <summary>
    /// @ears .sdd/features/admin-management/SPEC.md#REQ-CNT-08
    /// Xóa một danh mục ngành nghề (khi chưa có tin ràng buộc)
    /// </summary>
    Task<bool> DeleteCategoryAsync(int adminUserId, int categoryId, CancellationToken ct = default);

    /// <summary>
    /// @ears .sdd/features/admin-management/SPEC.md#REQ-CNT-09
    /// Lấy danh sách các yêu cầu tin đăng nổi bật (Featured Requests)
    /// </summary>
    Task<List<AdminFeaturedItemDto>> GetFeaturedRequestsAsync(CancellationToken ct = default);

    /// <summary>
    /// @ears .sdd/features/admin-management/SPEC.md#REQ-CNT-10
    /// Phê duyệt tin đăng nổi bật và kích hoạt thời hạn 7 ngày theo Q-017
    /// </summary>
    Task<bool> ApproveFeaturedAsync(int adminUserId, int featuredRequestId, CancellationToken ct = default);
}
