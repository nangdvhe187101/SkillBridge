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
