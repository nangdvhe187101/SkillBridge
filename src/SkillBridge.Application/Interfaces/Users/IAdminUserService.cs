using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Jobs;
using SkillBridge.Application.DTOs.Users;

namespace SkillBridge.Application.Interfaces.Users;

public interface IAdminUserService
{
    /// <summary>
    /// Lấy danh sách người dùng phân trang kèm bộ lọc (Role, Status, SubTab, Search)
    /// </summary>
    Task<PagedResult<AdminUserListItemDto>> GetUsersAsync(AdminUserFilterRequest filter, CancellationToken ct = default);

    /// <summary>
    /// Lấy số liệu thống kê tổng quan người dùng
    /// </summary>
    Task<AdminUserStatsDto> GetUserStatsAsync(CancellationToken ct = default);

    /// <summary>
    /// Lấy chi tiết thông tin hồ sơ người dùng kèm lịch sử hoạt động
    /// </summary>
    Task<AdminUserDetailDto> GetUserDetailAsync(int userId, CancellationToken ct = default);

    /// <summary>
    /// Khóa hoặc mở khóa tài khoản người dùng (tăng TokenVersion hủy phiên ngay lập tức khi khóa)
    /// </summary>
    Task<AdminUserListItemDto> ToggleLockUserAsync(int adminUserId, int targetUserId, AdminLockUserRequest request, CancellationToken ct = default);

    /// <summary>
    /// Đưa người dùng vào danh sách đen (Blacklist) vĩnh viễn
    /// </summary>
    Task<AdminUserListItemDto> BlacklistUserAsync(int adminUserId, int targetUserId, AdminBlacklistRequest request, CancellationToken ct = default);

    /// <summary>
    /// Gỡ người dùng ra khỏi danh sách đen
    /// </summary>
    Task<AdminUserListItemDto> RemoveFromBlacklistAsync(int adminUserId, int targetUserId, CancellationToken ct = default);

    /// <summary>
    /// Điều chỉnh điểm uy tín (Reliability Score) có giới hạn biên độ tối đa +-20 điểm
    /// </summary>
    Task<AdminUserListItemDto> AdjustReliabilityAsync(int adminUserId, int targetUserId, AdminAdjustReliabilityRequest request, CancellationToken ct = default);

    /// <summary>
    /// Phê duyệt xác thực định danh (eKYC) của người dùng
    /// </summary>
    Task<AdminUserListItemDto> VerifyKycAsync(int adminUserId, int targetUserId, CancellationToken ct = default);
}
