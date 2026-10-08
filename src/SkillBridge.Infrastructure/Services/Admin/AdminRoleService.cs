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
            RoleCode = MapToDtoRoleCode(m.Role?.Code),
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

        var rawPassword = string.IsNullOrWhiteSpace(dto.Password) ? "Admin@123" : dto.Password.Trim();
        if (rawPassword.Length < 6)
        {
            throw new BusinessException("Mật khẩu khởi tạo phải có ít nhất 6 ký tự.");
        }

        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var exists = await _dbContext.AdminTeamMembers.AnyAsync(m => m.Email == normalizedEmail, ct);
        if (exists)
        {
            throw new BusinessException($"Email '{dto.Email}' đã tồn tại trong đội ngũ quản trị.");
        }

        var role = await ResolveAdminRoleAsync(dto.RoleId, dto.RoleCode, ct);

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(rawPassword, workFactor: 11);

        // Đồng bộ hoặc tạo User trong bảng users để nhân sự có thể đăng nhập được vào Admin Portal
        var existingUser = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail, ct);
        if (existingUser != null)
        {
            existingUser.FullName = dto.Name.Trim();
            existingUser.PasswordHash = passwordHash;
            existingUser.RoleId = role.Id;
            existingUser.AccountStatus = "active";
            existingUser.KycStatus = "verified";
            existingUser.FailedLoginAttempts = 0;
            existingUser.LockoutUntil = null;
        }
        else
        {
            var newUser = new User
            {
                FullName = dto.Name.Trim(),
                Email = normalizedEmail,
                PasswordHash = passwordHash,
                RoleId = role.Id,
                AccountStatus = "active",
                KycStatus = "verified",
                ReliabilityScore = 100,
                JobsDoneCount = 0,
                TokenVersion = 1,
                FailedLoginAttempts = 0,
                JoinedAt = DateTime.UtcNow
            };
            await _dbContext.Users.AddAsync(newUser, ct);
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
        _logger.LogInformation("Đã thêm AdminTeamMember và tài khoản User: {Email} bởi AdminUserId: {Actor}", member.Email, actorAdminId);

        return new AdminTeamMemberDto
        {
            Id = member.Id,
            Name = member.Name,
            Email = member.Email,
            RoleId = member.RoleId,
            RoleCode = MapToDtoRoleCode(role.Code),
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

        if (string.Equals(member.Email, "skillbridge.vn@gmail.com", StringComparison.OrdinalIgnoreCase))
        {
            throw new BusinessException("Tài khoản Super Admin gốc (skillbridge.vn@gmail.com) luôn giữ vai trò Super Admin tối cao, không thể hạ quyền.");
        }

        if ((dto.RoleId.HasValue && dto.RoleId.Value > 0) || !string.IsNullOrWhiteSpace(dto.RoleCode))
        {
            var newRole = await ResolveAdminRoleAsync(dto.RoleId, dto.RoleCode, ct);
            member.RoleId = newRole.Id;
            member.Role = newRole;
        }

        if (dto.IsActive.HasValue)
        {
            member.IsActive = dto.IsActive.Value;
        }

        // Đồng bộ vai trò và mật khẩu (nếu có reset) sang bảng users
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == member.Email, ct);
        if (user != null)
        {
            user.RoleId = member.RoleId;
            if (dto.IsActive.HasValue)
            {
                user.AccountStatus = dto.IsActive.Value ? "active" : "locked";
            }
            if (!string.IsNullOrWhiteSpace(dto.Password) && dto.Password.Trim().Length >= 6)
            {
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password.Trim(), workFactor: 11);
                _logger.LogInformation("Admin #{Actor} đã đặt lại mật khẩu cho thành viên {Email}", actorAdminId, member.Email);
            }
        }

        await _dbContext.SaveChangesAsync(ct);
        await RecordAuditLogAsync(actorAdminId, $"Cập nhật vai trò/trạng thái thành viên {member.Name} ({member.Email}) -> Vai trò: {member.Role?.Name}, Hoạt động: {member.IsActive}.", ct);

        return new AdminTeamMemberDto
        {
            Id = member.Id,
            Name = member.Name,
            Email = member.Email,
            RoleId = member.RoleId,
            RoleCode = MapToDtoRoleCode(member.Role?.Code),
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

        if (string.Equals(member.Email, "skillbridge.vn@gmail.com", StringComparison.OrdinalIgnoreCase))
        {
            throw new BusinessException("Tài khoản Super Admin gốc (skillbridge.vn@gmail.com) là tài khoản tối cao bất biến, không thể xóa.");
        }

        var memberEmail = member.Email;
        var memberName = member.Name;

        // Nếu database là relational (MySQL / TiDB), giải phóng hoặc chuyển tiếp các liên kết khóa ngoại
        // để không bị lỗi 'Cannot delete or update a parent row: a foreign key constraint fails'
        if (_dbContext.Database.IsRelational())
        {
            var fallbackAdmin = await _dbContext.AdminTeamMembers
                .FirstOrDefaultAsync(a => a.Id != memberId && (a.Email == "skillbridge.vn@gmail.com" || a.IsActive == true), ct);
            var fallbackAdminId = fallbackAdmin?.Id ?? actorAdminId;

            // 1. audit_logs: actor_id NOT NULL -> chuyển sang fallback admin
            await _dbContext.AuditLogs
                .Where(a => a.ActorId == memberId)
                .ExecuteUpdateAsync(s => s.SetProperty(a => a.ActorId, fallbackAdminId), ct);

            // 2. moderation_queue: reviewed_by nullable -> set null
            await _dbContext.ModerationQueues
                .Where(m => m.ReviewedBy == memberId)
                .ExecuteUpdateAsync(s => s.SetProperty(m => m.ReviewedBy, (int?)null), ct);

            // 3. disputes: resolved_by nullable -> set null
            await _dbContext.Disputes
                .Where(d => d.ResolvedBy == memberId)
                .ExecuteUpdateAsync(s => s.SetProperty(d => d.ResolvedBy, (int?)null), ct);

            // 4. users: kyc_reviewed_by nullable -> set null
            await _dbContext.Users
                .Where(u => u.KycReviewedBy == memberId)
                .ExecuteUpdateAsync(s => s.SetProperty(u => u.KycReviewedBy, (int?)null), ct);

            // 5. bank_verification_requests: reviewed_by_admin_id nullable -> set null
            await _dbContext.BankVerificationRequests
                .Where(b => b.ReviewedByAdminId == memberId)
                .ExecuteUpdateAsync(s => s.SetProperty(b => b.ReviewedByAdminId, (int?)null), ct);

            // 6. student_verification_requests: reviewed_by_admin_id nullable -> set null
            await _dbContext.StudentVerificationRequests
                .Where(s => s.ReviewedByAdminId == memberId)
                .ExecuteUpdateAsync(s => s.SetProperty(s => s.ReviewedByAdminId, (int?)null), ct);

            // 7. support_tickets: resolved_by nullable -> set null
            await _dbContext.SupportTickets
                .Where(t => t.ResolvedBy == memberId)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.ResolvedBy, (int?)null), ct);

            // 8. withdrawal_requests: processed_by nullable -> set null
            await _dbContext.WithdrawalRequests
                .Where(w => w.ProcessedBy == memberId)
                .ExecuteUpdateAsync(s => s.SetProperty(w => w.ProcessedBy, (int?)null), ct);

            // 9. role_permissions: granted_by nullable -> set null
            await _dbContext.RolePermissions
                .Where(rp => rp.GrantedBy == memberId)
                .ExecuteUpdateAsync(s => s.SetProperty(rp => rp.GrantedBy, (int?)null), ct);

            // 10. user_badges: granted_by nullable -> set null
            await _dbContext.UserBadges
                .Where(ub => ub.GrantedBy == memberId)
                .ExecuteUpdateAsync(s => s.SetProperty(ub => ub.GrantedBy, (int?)null), ct);
        }
        else
        {
            var logs = await _dbContext.AuditLogs.Where(a => a.ActorId == memberId).ToListAsync(ct);
            foreach (var l in logs) l.ActorId = actorAdminId;
        }

        _dbContext.AdminTeamMembers.Remove(member);

        // Khóa tài khoản User tương ứng trong bảng users
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == memberEmail, ct);
        if (user != null && !string.Equals(user.Email, "skillbridge.vn@gmail.com", StringComparison.OrdinalIgnoreCase))
        {
            user.AccountStatus = "locked";
        }

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
            string.Equals(r.Code, normalizedCode, StringComparison.OrdinalIgnoreCase) ||
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

    private static string MapToDtoRoleCode(string? dbRoleCode)
    {
        if (string.IsNullOrWhiteSpace(dbRoleCode)) return "business_admin";
        var lower = dbRoleCode.Trim().ToLowerInvariant();
        return lower switch
        {
            "content_moderator" => "moderator",
            "dispute_officer" => "dispute",
            "finance_viewer" => "finance",
            "admin" => "business_admin",
            _ => lower
        };
    }

    private async Task<Role> ResolveAdminRoleAsync(int? roleId, string? roleCode, CancellationToken ct)
    {
        if (roleId.HasValue && roleId.Value > 0)
        {
            var roleById = await _dbContext.Roles.FirstOrDefaultAsync(r => r.Id == roleId.Value, ct);
            if (roleById != null) return roleById;
        }

        if (!string.IsNullOrWhiteSpace(roleCode))
        {
            var rawCode = roleCode.Trim().ToLowerInvariant();
            var targetCodes = rawCode switch
            {
                "business_admin" or "business" or "admin" => new[] { "business_admin", "admin" },
                "moderator" or "content_moderator" => new[] { "content_moderator", "moderator" },
                "dispute" or "dispute_officer" => new[] { "dispute_officer", "dispute" },
                "finance" or "finance_viewer" => new[] { "finance_viewer", "finance" },
                "super_admin" or "super" => new[] { "super_admin" },
                _ => new[] { rawCode }
            };

            foreach (var code in targetCodes)
            {
                var role = await _dbContext.Roles.FirstOrDefaultAsync(r => r.Code == code, ct);
                if (role != null) return role;
            }
        }

        // An toàn: Fallback mặc định về role nhân sự cấp dưới, tuyệt đối không bao giờ fallback về super_admin!
        var defaultRole = await _dbContext.Roles.FirstOrDefaultAsync(r => r.Code == "business_admin", ct)
                       ?? await _dbContext.Roles.FirstOrDefaultAsync(r => r.Code == "content_moderator" || r.Code == "moderator", ct)
                       ?? await _dbContext.Roles.FirstOrDefaultAsync(r => r.Code == "admin" && r.Code != "super_admin", ct)
                       ?? await _dbContext.Roles.FirstOrDefaultAsync(r => r.Type == "admin" && r.Code != "super_admin", ct)
                       ?? await _dbContext.Roles.FirstOrDefaultAsync(ct);

        if (defaultRole == null)
        {
            throw new BusinessException("Không tìm thấy vai trò phù hợp để gán cho thành viên.");
        }

        return defaultRole;
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
                new() { Id = 4, Code = "finance", Name = "Finance Viewer", Type = "admin", Description = "Đối soát doanh thu, kiểm toán giao dịch rút tiền", IsActive = true, CreatedAt = DateTime.UtcNow },
                new() { Id = 5, Code = "business_admin", Name = "Business Admin", Type = "admin", Description = "Kiểm soát nội dung, gói dịch vụ, đối tác quảng cáo và giám sát tin nhắn", IsActive = true, CreatedAt = DateTime.UtcNow }
            };
            await _dbContext.Roles.AddRangeAsync(roles, ct);
            await _dbContext.SaveChangesAsync(ct);
        }

        // 1. Đảm bảo role business_admin tồn tại
        var businessAdminRole = await _dbContext.Roles.FirstOrDefaultAsync(r => r.Code == "business_admin", ct);
        if (businessAdminRole == null)
        {
            businessAdminRole = new Role
            {
                Code = "business_admin",
                Name = "Business Admin",
                Type = "admin",
                Description = "Kiểm soát nội dung, gói dịch vụ, đối tác quảng cáo và giám sát tin nhắn",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            await _dbContext.Roles.AddAsync(businessAdminRole, ct);
            await _dbContext.SaveChangesAsync(ct);
            _logger.LogInformation("EnsureInitialTeamAndRolesSeed: Đã tạo role 'business_admin' thành công.");
        }

        // 2. Tự động khắc phục tài khoản linhtlkhs189008@fpt.edu.vn nếu bị gán nhầm sang super_admin (ID 3)
        var misassignedMembers = await _dbContext.AdminTeamMembers
            .Where(m => m.Email == "linhtlkhs189008@fpt.edu.vn" && m.RoleId == 3)
            .ToListAsync(ct);

        foreach (var m in misassignedMembers)
        {
            m.RoleId = businessAdminRole.Id;
            var u = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == m.Email, ct);
            if (u != null)
            {
                u.RoleId = businessAdminRole.Id;
            }
        }
        if (misassignedMembers.Count > 0)
        {
            await _dbContext.SaveChangesAsync(ct);
            _logger.LogInformation("EnsureInitialTeamAndRolesSeed: Đã điều chỉnh {Count} tài khoản linhtlkhs189008@fpt.edu.vn về role Business Admin.", misassignedMembers.Count);
        }

        if (!await _dbContext.AdminTeamMembers.AnyAsync(ct))
        {
            var superRole = await _dbContext.Roles.FirstOrDefaultAsync(r => r.Code == "super_admin" || r.Type == "admin", ct);
            var members = new List<AdminTeamMember>
            {
                new()
                {
                    Name = "Quản Trị Viên",
                    Email = "skillbridge.vn@gmail.com",
                    RoleId = superRole?.Id ?? 3,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                },
                new()
                {
                    Name = "Lê Quản Trị",
                    Email = "admin@skillbridge.vn",
                    RoleId = superRole?.Id ?? 3,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                }
            };
            await _dbContext.AdminTeamMembers.AddRangeAsync(members, ct);
            await _dbContext.SaveChangesAsync(ct);
        }
    }

    private async Task EnsureInitialPermissionSeedAsync(CancellationToken ct)
    {
        await EnsureInitialTeamAndRolesSeedAsync(ct);

        var seedList = new List<(string Name, string Group, string Url, string[] Roles)>
        {
            // 1. Nhóm Việc làm (Jobs)
            ("Tìm kiếm & Xem danh sách việc làm", "Việc làm", "/jobs", new[] { "guest", "student", "employer" }),
            ("Chi tiết việc làm & Xem mô tả yêu cầu", "Việc làm", "/jobs/:id", new[] { "guest", "student", "employer" }),
            ("Tải đề bài mẫu & Tài liệu đính kèm", "Việc làm", "/jobs/:id/attachment", new[] { "student", "employer" }),
            ("Nộp hồ sơ ứng tuyển & Cover letter", "Việc làm", "/jobs/:id/apply", new[] { "student" }),

            // 2. Nhóm Khám phá & Tài năng (Explore & Talents)
            ("Trang chủ SkillBridge", "Khám phá & Tài năng", "/", new[] { "guest", "student", "employer" }),
            ("Danh bạ Tài năng Sinh viên (Talents)", "Khám phá & Tài năng", "/talents", new[] { "guest", "student", "employer" }),
            ("Hồ sơ Portfolio công khai của Sinh viên", "Khám phá & Tài năng", "/student/:slug", new[] { "guest", "student", "employer" }),
            ("Trang thông tin Doanh nghiệp & Tin tuyển dụng", "Khám phá & Tài năng", "/company/:slug", new[] { "guest", "student", "employer" }),
            ("Bảng giá Gói Freelance Pro & VIP Business", "Khám phá & Tài năng", "/pricing", new[] { "guest", "student", "employer" }),
            ("Điều khoản, Chính sách bảo mật & Thanh toán", "Khám phá & Tài năng", "/terms", new[] { "guest", "student", "employer" }),
            ("Trang Trợ giúp & Liên hệ hỗ trợ", "Khám phá & Tài năng", "/contact", new[] { "guest", "student", "employer" }),

            // 3. Nhóm Xác thực & Tài khoản (Auth & Identity)
            ("Đăng nhập tài khoản & Google SSO", "Xác thực & Tài khoản", "/login", new[] { "guest" }),
            ("Đăng ký tài khoản Sinh viên / Tuyển dụng", "Xác thực & Tài khoản", "/register", new[] { "guest" }),
            ("Quên mật khẩu & Khôi phục tài khoản", "Xác thực & Tài khoản", "/forgot-password", new[] { "guest" }),
            ("Xác thực Email tài khoản", "Xác thực & Tài khoản", "/verify-email", new[] { "guest" }),

            // 4. Nhóm Sinh viên & Freelancer (Student)
            ("Không gian làm việc & Quản lý hợp đồng MyWork", "Sinh viên", "/mywork", new[] { "student" }),
            ("Nộp sản phẩm bàn giao (Deliverables) theo phiên bản", "Sinh viên", "/mywork/deliverables", new[] { "student" }),
            ("Cập nhật Hồ sơ cá nhân, Kỹ năng & Portfolio", "Sinh viên", "/profile", new[] { "student" }),
            ("Quản lý CV & Tài liệu đính kèm", "Sinh viên", "/settings/cv", new[] { "student" }),
            ("Xác minh Sinh viên qua Thẻ SV / eKYC", "Sinh viên", "/settings/verification", new[] { "student" }),

            // 5. Nhóm Tuyển dụng & Doanh nghiệp (Employer)
            ("Bảng điều khiển tuyển dụng Dashboard", "Doanh nghiệp", "/employer/dashboard", new[] { "employer" }),
            ("Đăng tin tuyển dụng & Tải file đề bài", "Doanh nghiệp", "/employer/post-job", new[] { "employer" }),
            ("Quản lý danh sách công việc đã đăng", "Doanh nghiệp", "/employer/jobs", new[] { "employer" }),
            ("Chỉnh sửa nội dung & Ngân sách công việc", "Doanh nghiệp", "/employer/jobs/:id/edit", new[] { "employer" }),
            ("Xem ứng viên, Phỏng vấn & Tuyển dụng", "Doanh nghiệp", "/employer/jobs/:jobId", new[] { "employer" }),
            ("Tạo & Quản lý Chiến dịch Quảng cáo Banner CPC", "Doanh nghiệp", "/employer/ads", new[] { "employer" }),

            // 6. Nhóm Tài chính & Ví Escrow (Finance & Escrow)
            ("Ví SkillBridge: Số dư, Nạp tiền & Rút tiền", "Tài chính & Escrow", "/wallet", new[] { "student", "employer" }),
            ("Ký quỹ Escrow bảo đảm & Nghiệm thu giải ngân", "Tài chính & Escrow", "/wallet/escrow", new[] { "employer" }),
            ("Gửi khiếu nại bồi thường Bảo hiểm & Tranh chấp", "Tài chính & Escrow", "/wallet/claim", new[] { "student", "employer" }),
            ("Trang kết quả thanh toán Cổng VNPAY / PayOS", "Tài chính & Escrow", "/payment/result", new[] { "student", "employer" }),

            // 7. Nhóm Giao tiếp & Hệ thống (Communication & Settings)
            ("Tin nhắn trao đổi công việc trực tuyến realtime", "Giao tiếp & Đồng hành", "/messages", new[] { "student", "employer" }),
            ("Mời bạn đồng hành 1-1 nhận quà trải nghiệm", "Giao tiếp & Đồng hành", "/settings/referral", new[] { "student", "employer" }),
            ("Cài đặt hồ sơ & Thông tin liên hệ cơ bản", "Hệ thống", "/settings/profile", new[] { "student", "employer" }),
            ("Đổi mật khẩu & Bảo mật tài khoản", "Hệ thống", "/settings/password", new[] { "student", "employer" }),

            // 8. Nhóm Quản trị hệ thống (Admin & Governance)
            ("Bảng điều khiển Admin Portal", "Quản trị", "/admin", new[] { "admin", "super_admin" }),
            ("Quản trị người dùng & KYC", "Quản trị", "/admin/users", new[] { "admin", "super_admin" }),
            ("Giải quyết tranh chấp Escrow", "Quản trị", "/admin/disputes", new[] { "admin", "super_admin" }),
            ("Cấu hình hệ thống & Email", "Hệ thống", "/admin/ops", new[] { "admin", "super_admin" })
        };

        var allRoles = await _dbContext.Roles.ToListAsync(ct);
        var defaultAdmin = await _dbContext.AdminTeamMembers.FirstOrDefaultAsync(ct);
        var existingEndpoints = await _dbContext.Permissions.Select(p => p.Endpoint).ToListAsync(ct);

        foreach (var item in seedList)
        {
            if (existingEndpoints.Contains(item.Url, StringComparer.OrdinalIgnoreCase)) continue;

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

            var assignedRoleIds = new HashSet<int>();
            foreach (var rCode in item.Roles)
            {
                var role = allRoles.FirstOrDefault(r =>
                    string.Equals(NormalizeRoleCode(r.Code), NormalizeRoleCode(rCode), StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(r.Code, rCode, StringComparison.OrdinalIgnoreCase));

                if (role != null && assignedRoleIds.Add(role.Id))
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
