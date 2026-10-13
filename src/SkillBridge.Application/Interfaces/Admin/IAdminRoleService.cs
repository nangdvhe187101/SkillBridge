using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Admin;

namespace SkillBridge.Application.Interfaces.Admin;

/// <summary>
/// Giao diện dịch vụ Quản trị Đội ngũ Quản trị & Ma trận Phân quyền URL (RBAC)
/// </summary>
public interface IAdminRoleService
{
    /// <summary>
    /// Lấy danh sách thành viên đội ngũ quản trị nội bộ
    /// </summary>
    Task<List<AdminTeamMemberDto>> GetTeamMembersAsync(CancellationToken ct = default);

    /// <summary>
    /// Thêm thành viên mới vào đội ngũ quản trị
    /// </summary>
    Task<AdminTeamMemberDto> AddTeamMemberAsync(CreateAdminTeamMemberDto dto, int actorAdminId, CancellationToken ct = default);

    /// <summary>
    /// Cập nhật vai trò hoặc trạng thái hoạt động của thành viên quản trị
    /// </summary>
    Task<AdminTeamMemberDto> UpdateTeamMemberRoleAsync(int memberId, UpdateAdminTeamMemberRoleDto dto, int actorAdminId, CancellationToken ct = default);

    /// <summary>
    /// Xóa thành viên khỏi đội ngũ quản trị
    /// </summary>
    Task DeleteTeamMemberAsync(int memberId, int actorAdminId, CancellationToken ct = default);

    /// <summary>
    /// Khôi phục tài khoản user (sinh viên/nhà tuyển dụng) bị chuyển nhầm thành nhân sự quản trị:
    /// gỡ khỏi đội ngũ quản trị, trả về role user, đặt mật khẩu mới và tự lấy lại thông tin cá nhân còn lưu trong hệ thống.
    /// </summary>
    Task<RestoreUserAccountResultDto> RestoreUserAccountAsync(int memberId, RestoreUserAccountDto dto, int actorAdminId, CancellationToken ct = default);

    /// <summary>
    /// Lấy danh sách các vai trò quản trị nội bộ trong hệ thống
    /// </summary>
    Task<List<AdminRoleItemDto>> GetRolesAsync(CancellationToken ct = default);

    /// <summary>
    /// Lấy toàn bộ ma trận phân quyền URL Route & Tính năng cho từng vai trò
    /// </summary>
    Task<List<AdminPermissionMatrixItemDto>> GetPermissionMatrixAsync(CancellationToken ct = default);

    /// <summary>
    /// Thêm một URL route / tính năng mới vào ma trận phân quyền
    /// </summary>
    Task<AdminPermissionMatrixItemDto> AddPermissionRouteAsync(CreatePermissionDto dto, int actorAdminId, CancellationToken ct = default);

    /// <summary>
    /// Bật hoặc tắt quyền của một vai trò trên một tính năng / URL route
    /// </summary>
    Task ToggleRolePermissionAsync(ToggleRolePermissionDto dto, int actorAdminId, CancellationToken ct = default);

    /// <summary>
    /// Xóa một URL route / tính năng khỏi ma trận phân quyền
    /// </summary>
    Task DeletePermissionRouteAsync(int permissionId, int actorAdminId, CancellationToken ct = default);
}
