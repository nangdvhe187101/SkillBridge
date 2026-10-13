using System;
using System.Collections.Generic;

namespace SkillBridge.Application.DTOs.Admin;

/// <summary>
/// DTO thông tin thành viên đội ngũ quản trị
/// </summary>
public class AdminTeamMemberDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int RoleId { get; set; }
    public string RoleCode { get; set; } = string.Empty;
    public string RoleName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// true nếu email này từng là tài khoản sinh viên/nhà tuyển dụng có dữ liệu (job, CV, ứng tuyển, hồ sơ...)
    /// — dấu hiệu tài khoản user bị chuyển nhầm thành admin, cần khôi phục.
    /// </summary>
    public bool HasUserActivity { get; set; }

    /// <summary>
    /// Vai trò user gợi ý khi khôi phục ("student" | "employer"), suy ra từ dữ liệu còn lại.
    /// </summary>
    public string? SuggestedUserRoleCode { get; set; }
}

/// <summary>
/// DTO thêm thành viên quản trị mới
/// </summary>
public class CreateAdminTeamMemberDto
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Password { get; set; }
    public int? RoleId { get; set; }
    public string? RoleCode { get; set; }
}

/// <summary>
/// DTO cập nhật vai trò hoặc trạng thái thành viên quản trị
/// </summary>
public class UpdateAdminTeamMemberRoleDto
{
    public int? RoleId { get; set; }
    public string? RoleCode { get; set; }
    public bool? IsActive { get; set; }
    public string? Password { get; set; }
}

/// <summary>
/// DTO khôi phục một tài khoản user bị chuyển nhầm thành nhân sự quản trị
/// </summary>
public class RestoreUserAccountDto
{
    /// <summary>"student" hoặc "employer"</summary>
    public string RoleCode { get; set; } = string.Empty;

    /// <summary>Mật khẩu mới cho user (bắt buộc, theo chính sách mật khẩu đăng ký)</summary>
    public string NewPassword { get; set; } = string.Empty;

    /// <summary>Họ tên ghi đè (tuỳ chọn). Bỏ trống để hệ thống tự lấy lại từ hồ sơ xác thực.</summary>
    public string? FullName { get; set; }
}

/// <summary>
/// Kết quả khôi phục tài khoản user
/// </summary>
public class RestoreUserAccountResultDto
{
    public int UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string RoleCode { get; set; } = string.Empty;
    public string KycStatus { get; set; } = string.Empty;
    public string? School { get; set; }

    /// <summary>Danh sách thông tin đã được tự động lấy lại, để hiển thị cho admin</summary>
    public List<string> RecoveredFields { get; set; } = new();
}

/// <summary>
/// DTO vai trò trong hệ thống
/// </summary>
public class AdminRoleItemDto
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = "admin";
    public string? Description { get; set; }
    public int MemberCount { get; set; }
    public List<string> Modules { get; set; } = new();
}

/// <summary>
/// DTO một dòng trong Ma trận Phân quyền URL & Tính năng (RBAC Matrix)
/// </summary>
public class AdminPermissionMatrixItemDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Group { get; set; } = "Hệ thống";
    public string Url { get; set; } = string.Empty;
    public string? Method { get; set; }
    public List<string> Roles { get; set; } = new(); // 'guest', 'student', 'employer', 'admin', 'super'
}

/// <summary>
/// DTO thêm chức năng / URL route mới vào ma trận phân quyền
/// </summary>
public class CreatePermissionDto
{
    public string Name { get; set; } = string.Empty;
    public string Group { get; set; } = "Tuyển dụng";
    public string Url { get; set; } = string.Empty;
    public string? Method { get; set; }
    public List<string> Roles { get; set; } = new();
}

/// <summary>
/// DTO bật hoặc tắt quyền của một vai trò trên chức năng / route
/// </summary>
public class ToggleRolePermissionDto
{
    public int PermissionId { get; set; }
    public string RoleCode { get; set; } = string.Empty;
    public bool IsGranted { get; set; }
}
