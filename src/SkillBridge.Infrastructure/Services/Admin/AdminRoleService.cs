using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Admin;
using SkillBridge.Application.Interfaces.Admin;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Services.Admin;

/// <summary>
/// Cài đặt dịch vụ Quản trị Đội ngũ Quản trị & Ma trận Phân quyền URL (RBAC)
/// </summary>
public class AdminRoleService : IAdminRoleService
{
    private readonly SkillBridgeDbContext _dbContext;
    private readonly ILogger<AdminRoleService> _logger;

    public AdminRoleService(
        SkillBridgeDbContext dbContext,
        ILogger<AdminRoleService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<List<AdminTeamMemberDto>> GetTeamMembersAsync(CancellationToken ct = default)
    {
        await EnsureInitialTeamAndRolesSeedAsync(ct);

        var members = await _dbContext.AdminTeamMembers
            .Include(m => m.Role)
            .OrderBy(m => m.Id)
            .AsNoTracking()
            .ToListAsync(ct);

        return members.Select(m => new AdminTeamMemberDto
        {
            Id = m.Id,
            Name = m.Name,
            Email = m.Email,
            RoleId = m.RoleId,
            RoleCode = m.Role?.Code ?? "admin",
            RoleName = m.Role?.Name ?? "Quản trị viên",
            IsActive = m.IsActive ?? true,
            CreatedAt = m.CreatedAt
        }).ToList();
    }

    /// <inheritdoc />
    public async Task<AdminTeamMemberDto> AddTeamMemberAsync(CreateAdminTeamMemberDto dto, int actorAdminId, CancellationToken ct = default)
    {
        await EnsureInitialTeamAndRolesSeedAsync(ct);

        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Email))
        {
            throw new BusinessException("Họ tên và email của thành viên không được để trống.");
        }

        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var exists = await _dbContext.AdminTeamMembers.AnyAsync(m => m.Email == normalizedEmail, ct);
        if (exists)
        {
            throw new BusinessException($"Email '{dto.Email}' đã tồn tại trong đội ngũ quản trị.");
        }

        Role? role = null;
        if (dto.RoleId.HasValue && dto.RoleId.Value > 0)
        {
            role = await _dbContext.Roles.FirstOrDefaultAsync(r => r.Id == dto.RoleId.Value, ct);
        }
        else if (!string.IsNullOrWhiteSpace(dto.RoleCode))
        {
            role = await _dbContext.Roles.FirstOrDefaultAsync(r => r.Code == dto.RoleCode.Trim().ToLowerInvariant(), ct);
        }

        if (role == null)
        {
            role = await _dbContext.Roles.FirstOrDefaultAsync(r => r.Code == "moderator" || r.Type == "admin", ct)
                   ?? await _dbContext.Roles.FirstOrDefaultAsync(ct);
        }

        if (role == null)
        {
            throw new BusinessException("Không tìm thấy vai trò phù hợp để gán cho thành viên.");
        }

        var member = new AdminTeamMember
        {
            Name = dto.Name.Trim(),
            Email = normalizedEmail,
            RoleId = role.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _dbContext.AdminTeamMembers.AddAsync(member, ct);
        await _dbContext.SaveChangesAsync(ct);

        await RecordAuditLogAsync(actorAdminId, $"Thêm thành viên quản trị mới: {member.Name} ({member.Email}) - Vai trò: {role.Name}.", ct);
        _logger.LogInformation("Đã thêm AdminTeamMember: {Email} bởi AdminUserId: {Actor}", member.Email, actorAdminId);

        return new AdminTeamMemberDto
        {
            Id = member.Id,
            Name = member.Name,
            Email = member.Email,
            RoleId = member.RoleId,
            RoleCode = role.Code,
            RoleName = role.Name,
            IsActive = member.IsActive ?? true,
            CreatedAt = member.CreatedAt
        };
    }

    /// <inheritdoc />
    public async Task<AdminTeamMemberDto> UpdateTeamMemberRoleAsync(int memberId, UpdateAdminTeamMemberRoleDto dto, int actorAdminId, CancellationToken ct = default)
    {
        await EnsureInitialTeamAndRolesSeedAsync(ct);

        var member = await _dbContext.AdminTeamMembers
            .Include(m => m.Role)
            .FirstOrDefaultAsync(m => m.Id == memberId, ct);

        if (member == null)
        {
            throw new BusinessException($"Không tìm thấy thành viên quản trị #{memberId}.");
        }

        if (dto.RoleId.HasValue && dto.RoleId.Value > 0)
        {
            var role = await _dbContext.Roles.FirstOrDefaultAsync(r => r.Id == dto.RoleId.Value, ct);
            if (role != null)
            {
                member.RoleId = role.Id;
                member.Role = role;
            }
        }
        else if (!string.IsNullOrWhiteSpace(dto.RoleCode))
        {
            var role = await _dbContext.Roles.FirstOrDefaultAsync(r => r.Code == dto.RoleCode.Trim().ToLowerInvariant(), ct);
            if (role != null)
            {
                member.RoleId = role.Id;
                member.Role = role;
            }
        }

        if (dto.IsActive.HasValue)
        {
            member.IsActive = dto.IsActive.Value;
        }

        await _dbContext.SaveChangesAsync(ct);
        await RecordAuditLogAsync(actorAdminId, $"Cập nhật vai trò/trạng thái thành viên {member.Name} ({member.Email}) -> Vai trò: {member.Role?.Name}, Hoạt động: {member.IsActive}.", ct);

        return new AdminTeamMemberDto
        {
            Id = member.Id,
            Name = member.Name,
            Email = member.Email,
            RoleId = member.RoleId,
            RoleCode = member.Role?.Code ?? "admin",
            RoleName = member.Role?.Name ?? "Quản trị viên",
            IsActive = member.IsActive ?? true,
            CreatedAt = member.CreatedAt
        };
    }

    /// <inheritdoc />
    public async Task DeleteTeamMemberAsync(int memberId, int actorAdminId, CancellationToken ct = default)
    {
        var member = await _dbContext.AdminTeamMembers.FirstOrDefaultAsync(m => m.Id == memberId, ct);
        if (member == null)
        {
            throw new BusinessException($"Không tìm thấy thành viên quản trị #{memberId}.");
        }

        var memberEmail = member.Email;
        var memberName = member.Name;

        _dbContext.AdminTeamMembers.Remove(member);
        await _dbContext.SaveChangesAsync(ct);

        await RecordAuditLogAsync(actorAdminId, $"Xóa thành viên {memberName} ({memberEmail}) khỏi đội ngũ quản trị.", ct);
        _logger.LogInformation("Đã xóa AdminTeamMember #{MemberId} ({Email}) bởi AdminUserId {Actor}", memberId, memberEmail, actorAdminId);
    }

    /// <inheritdoc />
    public async Task<List<AdminRoleItemDto>> GetRolesAsync(CancellationToken ct = default)
    {
        await EnsureInitialTeamAndRolesSeedAsync(ct);

        var roles = await _dbContext.Roles
            .Include(r => r.AdminTeamMembers)
            .Include(r => r.RolePermissions)
            .ThenInclude(rp => rp.Permission)
            .AsNoTracking()
            .ToListAsync(ct);

        return roles.Select(r => new AdminRoleItemDto
        {
            Id = r.Id,
            Code = r.Code,
            Name = r.Name,
            Type = r.Type,
            Description = r.Description,
            MemberCount = r.AdminTeamMembers.Count,
            Modules = r.RolePermissions
                .Select(rp => rp.Permission?.Module ?? "Chung")
                .Distinct()
                .ToList()
        }).ToList();
    }

    /// <inheritdoc />
    public async Task<List<AdminPermissionMatrixItemDto>> GetPermissionMatrixAsync(CancellationToken ct = default)
    {
        await EnsureInitialPermissionSeedAsync(ct);

        var permissions = await _dbContext.Permissions
            .Include(p => p.RolePermissions)
            .ThenInclude(rp => rp.Role)
            .OrderBy(p => p.Module)
            .ThenBy(p => p.Id)
            .AsNoTracking()
            .ToListAsync(ct);

        return permissions.Select(p => new AdminPermissionMatrixItemDto
        {
            Id = p.Id,
            Name = p.Name,
            Group = p.Module,
            Url = p.Endpoint,
            Method = p.Method,
            Roles = p.RolePermissions
                .Where(rp => rp.Role != null)
                .Select(rp => NormalizeRoleCode(rp.Role!.Code))
                .Distinct()
                .ToList()
        }).ToList();
    }

    /// <inheritdoc />
    public async Task<AdminPermissionMatrixItemDto> AddPermissionRouteAsync(CreatePermissionDto dto, int actorAdminId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Url))
        {
            throw new BusinessException("Tên tính năng và URL route không được để trống.");
        }

        var permission = new Permission
        {
            Name = dto.Name.Trim(),
            Module = string.IsNullOrWhiteSpace(dto.Group) ? "Hệ thống" : dto.Group.Trim(),
            Endpoint = dto.Url.Trim(),
            Method = dto.Method ?? "GET",
            Description = $"Khai báo URL {dto.Url.Trim()} trong ma trận RBAC"
        };

        await _dbContext.Permissions.AddAsync(permission, ct);
        await _dbContext.SaveChangesAsync(ct);

        // Gán quyền cho các role được chọn
        if (dto.Roles != null && dto.Roles.Count > 0)
        {
            var allRoles = await _dbContext.Roles.ToListAsync(ct);
            var actorMember = await GetActorAdminMemberAsync(actorAdminId, ct);

            foreach (var rCode in dto.Roles)
            {
                var targetRole = allRoles.FirstOrDefault(r =>
                    string.Equals(NormalizeRoleCode(r.Code), NormalizeRoleCode(rCode), StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(r.Code, rCode, StringComparison.OrdinalIgnoreCase));

                if (targetRole != null)
                {
                    await _dbContext.RolePermissions.AddAsync(new RolePermission
                    {
                        RoleId = targetRole.Id,
                        PermissionId = permission.Id,
                        GrantedBy = actorMember.Id,
                        GrantedAt = DateTime.UtcNow
                    }, ct);
                }
            }
            await _dbContext.SaveChangesAsync(ct);
        }

        await RecordAuditLogAsync(actorAdminId, $"Thêm tính năng/URL mới vào Ma trận RBAC: '{permission.Name}' ({permission.Endpoint}).", ct);

        return new AdminPermissionMatrixItemDto
        {
            Id = permission.Id,
            Name = permission.Name,
            Group = permission.Module,
            Url = permission.Endpoint,
            Method = permission.Method,
            Roles = dto.Roles ?? new List<string>()
        };
    }

    /// <inheritdoc />
    public async Task ToggleRolePermissionAsync(ToggleRolePermissionDto dto, int actorAdminId, CancellationToken ct = default)
    {
        var permission = await _dbContext.Permissions
            .Include(p => p.RolePermissions)
            .FirstOrDefaultAsync(p => p.Id == dto.PermissionId, ct);

        if (permission == null)
        {
            throw new BusinessException($"Không tìm thấy tính năng #{dto.PermissionId}.");
        }

        var normalizedCode = NormalizeRoleCode(dto.RoleCode);
        var role = await _dbContext.Roles.FirstOrDefaultAsync(r =>
            r.Code.ToLower() == normalizedCode.ToLower() ||
            (normalizedCode == "admin" && (r.Code == "admin" || r.Code == "super_admin")) ||
            (normalizedCode == "student" && (r.Code == "talent" || r.Code == "student")), ct);

        if (role == null)
        {
            throw new BusinessException($"Không tìm thấy vai trò '{dto.RoleCode}' trong hệ thống.");
        }

        var existingGrant = permission.RolePermissions.FirstOrDefault(rp => rp.RoleId == role.Id);

        if (dto.IsGranted && existingGrant == null)
        {
            var actorMember = await GetActorAdminMemberAsync(actorAdminId, ct);
            await _dbContext.RolePermissions.AddAsync(new RolePermission
            {
                RoleId = role.Id,
                PermissionId = permission.Id,
                GrantedBy = actorMember.Id,
                GrantedAt = DateTime.UtcNow
            }, ct);
            await RecordAuditLogAsync(actorAdminId, $"Cấp quyền truy cập '{permission.Endpoint}' cho vai trò '{role.Name}'.", ct);
        }
        else if (!dto.IsGranted && existingGrant != null)
        {
            _dbContext.RolePermissions.Remove(existingGrant);
            await RecordAuditLogAsync(actorAdminId, $"Thu hồi quyền truy cập '{permission.Endpoint}' của vai trò '{role.Name}'.", ct);
        }

        await _dbContext.SaveChangesAsync(ct);
    }

    /// <inheritdoc />
    public async Task DeletePermissionRouteAsync(int permissionId, int actorAdminId, CancellationToken ct = default)
    {
        var permission = await _dbContext.Permissions
            .Include(p => p.RolePermissions)
            .FirstOrDefaultAsync(p => p.Id == permissionId, ct);

        if (permission == null)
        {
            throw new BusinessException($"Không tìm thấy tính năng #{permissionId}.");
        }

        var ep = permission.Endpoint;
        var name = permission.Name;

        _dbContext.RolePermissions.RemoveRange(permission.RolePermissions);
        _dbContext.Permissions.Remove(permission);
        await _dbContext.SaveChangesAsync(ct);

        await RecordAuditLogAsync(actorAdminId, $"Xóa tính năng/URL '{name}' ({ep}) khỏi ma trận RBAC.", ct);
    }

    private static string NormalizeRoleCode(string rawCode)
    {
        var lower = rawCode.ToLowerInvariant();
        if (lower == "talent") return "student";
        if (lower == "super_admin") return "admin";
        return lower;
    }

    private async Task<AdminTeamMember> GetActorAdminMemberAsync(int actorAdminId, CancellationToken ct)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == actorAdminId, ct);
        if (user != null)
        {
            var existing = await _dbContext.AdminTeamMembers.FirstOrDefaultAsync(a => a.Email == user.Email, ct);
            if (existing != null) return existing;
        }

        var defaultAdmin = await _dbContext.AdminTeamMembers.FirstOrDefaultAsync(ct);
        if (defaultAdmin != null) return defaultAdmin;

        var newAdmin = new AdminTeamMember
        {
            Name = user?.FullName ?? "Quản trị viên",
            Email = user?.Email ?? "admin@skillbridge.vn",
            RoleId = 1,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        await _dbContext.AdminTeamMembers.AddAsync(newAdmin, ct);
        await _dbContext.SaveChangesAsync(ct);
        return newAdmin;
    }

    private async Task RecordAuditLogAsync(int actorId, string actionText, CancellationToken ct)
    {
        try
        {
            var member = await GetActorAdminMemberAsync(actorId, ct);
            var log = new AuditLog
            {
                ActorId = member.Id,
                ActionText = actionText,
                CreatedAt = DateTime.UtcNow
            };
            await _dbContext.AuditLogs.AddAsync(log, ct);
            await _dbContext.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Không thể ghi nhật ký AuditLog: {ActionText}", actionText);
        }
    }

    private async Task EnsureInitialTeamAndRolesSeedAsync(CancellationToken ct)
    {
        if (!await _dbContext.Roles.AnyAsync(ct))
        {
            var roles = new List<Role>
            {
                new() { Id = 1, Code = "super_admin", Name = "Super Admin", Type = "admin", Description = "Toàn quyền quản trị hệ sinh thái SkillBridge", IsActive = true, CreatedAt = DateTime.UtcNow },
                new() { Id = 2, Code = "moderator", Name = "Content Moderator", Type = "admin", Description = "Kiểm duyệt tin tuyển dụng, bài nộp CV và bình luận", IsActive = true, CreatedAt = DateTime.UtcNow },
                new() { Id = 3, Code = "dispute", Name = "Dispute Officer", Type = "admin", Description = "Tiếp nhận, đối soát và phân xử tranh chấp Escrow", IsActive = true, CreatedAt = DateTime.UtcNow },
                new() { Id = 4, Code = "finance", Name = "Finance Viewer", Type = "admin", Description = "Đối soát doanh thu, kiểm toán giao dịch rút tiền", IsActive = true, CreatedAt = DateTime.UtcNow }
            };
            await _dbContext.Roles.AddRangeAsync(roles, ct);
            await _dbContext.SaveChangesAsync(ct);
        }

        if (!await _dbContext.AdminTeamMembers.AnyAsync(ct))
        {
            var superRole = await _dbContext.Roles.FirstOrDefaultAsync(r => r.Code == "super_admin" || r.Type == "admin", ct);
            var modRole = await _dbContext.Roles.FirstOrDefaultAsync(r => r.Code == "moderator", ct) ?? superRole;

            var members = new List<AdminTeamMember>
            {
                new() { Name = "Đặng Vũ Văn Năng", Email = "nangdv@skillbridge.vn", RoleId = superRole!.Id, IsActive = true, CreatedAt = DateTime.UtcNow.AddMonths(-3) },
                new() { Name = "Nguyễn Minh Hằng", Email = "hangnm@skillbridge.vn", RoleId = modRole!.Id, IsActive = true, CreatedAt = DateTime.UtcNow.AddMonths(-2) }
            };
            await _dbContext.AdminTeamMembers.AddRangeAsync(members, ct);
            await _dbContext.SaveChangesAsync(ct);
        }
    }

    private async Task EnsureInitialPermissionSeedAsync(CancellationToken ct)
    {
        if (await _dbContext.Permissions.AnyAsync(ct)) return;

        await EnsureInitialTeamAndRolesSeedAsync(ct);

        var seedList = new List<(string Name, string Group, string Url, string[] Roles)>
        {
            ("Xem danh sách việc làm", "Việc làm", "/jobs", new[] { "guest", "student", "employer", "admin" }),
            ("Đăng tin tuyển dụng mới", "Tuyển dụng", "/post-job", new[] { "employer", "admin" }),
            ("Quản lý việc làm đã đăng", "Tuyển dụng", "/employer/jobs", new[] { "employer", "admin" }),
            ("Nộp đơn ứng tuyển", "Sinh viên", "/jobs/:id/apply", new[] { "student", "admin" }),
            ("Ví tiền & Giao dịch", "Tài chính", "/wallet", new[] { "student", "employer", "admin" }),
            ("Yêu cầu rút tiền", "Tài chính", "/wallet/withdraw", new[] { "student", "employer", "admin" }),
            ("Trò chuyện trực tuyến", "Giao tiếp", "/messages", new[] { "student", "employer", "admin" }),
            ("Báo cáo tranh chấp", "Tuyển dụng", "/disputes/new", new[] { "student", "employer", "admin" }),
            ("Bảng điều khiển Admin", "Quản trị", "/admin", new[] { "admin" }),
            ("Quản trị người dùng & KYC", "Quản trị", "/admin/users", new[] { "admin" }),
            ("Giải quyết tranh chấp Escrow", "Quản trị", "/admin/disputes", new[] { "admin" }),
            ("Cấu hình hệ thống & Email", "Hệ thống", "/admin/ops", new[] { "admin" })
        };

        var allRoles = await _dbContext.Roles.ToListAsync(ct);
        var defaultAdmin = await _dbContext.AdminTeamMembers.FirstOrDefaultAsync(ct);

        foreach (var item in seedList)
        {
            var p = new Permission
            {
                Name = item.Name,
                Module = item.Group,
                Endpoint = item.Url,
                Method = "GET",
                Description = item.Name
            };
            await _dbContext.Permissions.AddAsync(p, ct);
            await _dbContext.SaveChangesAsync(ct);

            foreach (var rCode in item.Roles)
            {
                var role = allRoles.FirstOrDefault(r =>
                    string.Equals(NormalizeRoleCode(r.Code), NormalizeRoleCode(rCode), StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(r.Code, rCode, StringComparison.OrdinalIgnoreCase));

                if (role != null)
                {
                    await _dbContext.RolePermissions.AddAsync(new RolePermission
                    {
                        RoleId = role.Id,
                        PermissionId = p.Id,
                        GrantedBy = defaultAdmin?.Id ?? 1,
                        GrantedAt = DateTime.UtcNow
                    }, ct);
                }
            }
        }

        await _dbContext.SaveChangesAsync(ct);
    }
}
