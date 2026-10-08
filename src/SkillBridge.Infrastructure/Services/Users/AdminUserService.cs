using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Jobs;
using SkillBridge.Application.DTOs.Users;
using SkillBridge.Application.Interfaces.Users;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Services.Users;

public class AdminUserService : IAdminUserService
{
    private readonly SkillBridgeDbContext _dbContext;
    private readonly ILogger<AdminUserService> _logger;

    public AdminUserService(SkillBridgeDbContext dbContext, ILogger<AdminUserService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task<PagedResult<AdminUserListItemDto>> GetUsersAsync(AdminUserFilterRequest filter, CancellationToken ct = default)
    {
        var query = _dbContext.Users
            .AsNoTracking()
            .Include(u => u.Role)
            .Where(u => u.Role.Type == "user") // Chỉ lấy người dùng khách hàng (sinh viên, nhà tuyển dụng), không lấy quản trị viên
            .AsQueryable();

        // 1. Lọc theo SubTab (all | kyc | blacklist)
        if (!string.IsNullOrWhiteSpace(filter.SubTab))
        {
            if (string.Equals(filter.SubTab, "kyc", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(u => u.KycStatus == "pending");
            }
            else if (string.Equals(filter.SubTab, "blacklist", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(u => u.AccountStatus == "blacklisted");
            }
        }

        // 2. Lọc theo Role (student | employer | admin)
        if (!string.IsNullOrWhiteSpace(filter.Role) && !string.Equals(filter.Role, "all", StringComparison.OrdinalIgnoreCase))
        {
            var roleFilter = filter.Role.ToLowerInvariant();
            query = query.Where(u => u.Role.Code.ToLower() == roleFilter || u.Role.Type.ToLower() == roleFilter);
        }

        // 3. Lọc theo Status (active | pending | locked | blacklisted)
        if (!string.IsNullOrWhiteSpace(filter.Status) && !string.Equals(filter.Status, "all", StringComparison.OrdinalIgnoreCase))
        {
            var statusFilter = filter.Status.ToLowerInvariant();
            query = query.Where(u => u.AccountStatus.ToLower() == statusFilter);
        }

        // 4. Tìm kiếm từ khóa (Fuzzy search theo Tên, Email, SĐT, Trường học, ID)
        if (!string.IsNullOrWhiteSpace(filter.Query))
        {
            var keyword = filter.Query.Trim().ToLower();
            query = query.Where(u =>
                u.FullName.ToLower().Contains(keyword) ||
                u.Email.ToLower().Contains(keyword) ||
                (u.PhoneNumber != null && u.PhoneNumber.Contains(keyword)) ||
                (u.School != null && u.School.ToLower().Contains(keyword)) ||
                u.Id.ToString() == keyword);
        }

        var totalCount = await query.CountAsync(ct);
        var page = filter.Page > 0 ? filter.Page : 1;
        var pageSize = filter.PageSize > 0 ? filter.PageSize : 10;

        var items = await query
            .OrderByDescending(u => u.JoinedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var dtos = items.Select(MapToListItemDto).ToList();

        return new PagedResult<AdminUserListItemDto>
        {
            Items = dtos,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<AdminUserStatsDto> GetUserStatsAsync(CancellationToken ct = default)
    {
        var usersQuery = _dbContext.Users.AsNoTracking().Include(u => u.Role).Where(u => u.Role.Type == "user");

        var totalUsers = await usersQuery.CountAsync(ct);
        var studentsCount = await usersQuery.CountAsync(u => u.Role.Code == "student", ct);
        var employersCount = await usersQuery.CountAsync(u => u.Role.Code == "employer", ct);
        var pendingKycCount = await usersQuery.CountAsync(u => u.KycStatus == "pending", ct);
        var blacklistedCount = await usersQuery.CountAsync(u => u.AccountStatus == "blacklisted", ct);

        double avgReliability = 0.0;
        if (totalUsers > 0)
        {
            var sumReliability = await usersQuery.SumAsync(u => u.ReliabilityScore, ct);
            avgReliability = Math.Round((double)sumReliability / totalUsers, 1);
        }

        return new AdminUserStatsDto
        {
            TotalUsers = totalUsers,
            StudentsCount = studentsCount,
            EmployersCount = employersCount,
            PendingKycCount = pendingKycCount,
            BlacklistedCount = blacklistedCount,
            AverageReliability = avgReliability
        };
    }

    public async Task<AdminUserDetailDto> GetUserDetailAsync(int userId, CancellationToken ct = default)
    {
        var user = await _dbContext.Users
            .AsNoTracking()
            .Include(u => u.Role)
            .Include(u => u.Applications)
            .FirstOrDefaultAsync(u => u.Id == userId, ct);

        if (user == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy người dùng với ID #{userId}.");
        }

        var wallet = await _dbContext.Wallets
            .AsNoTracking()
            .FirstOrDefaultAsync(w => w.UserId == userId, ct);

        var activeJobsCount = await _dbContext.Jobs
            .AsNoTracking()
            .CountAsync(j => (j.EmployerId == userId || j.HiredApplicantId == userId) && j.Status == "in_progress", ct);

        var dto = new AdminUserDetailDto
        {
            Id = user.Id,
            Name = user.FullName,
            Email = user.Email,
            Phone = MaskPhoneNumber(user.PhoneNumber),
            Role = user.Role.Code,
            Status = user.AccountStatus,
            Kyc = user.KycStatus,
            Reliability = user.ReliabilityScore,
            JobsDone = user.JobsDoneCount,
            School = user.School,
            Industry = user.Industry,
            AvatarUrl = user.AvatarUrl,
            BlacklistReason = user.BlacklistReason,
            JoinedAt = user.JoinedAt,
            CompanySize = user.CompanySize,
            Website = user.Website,
            CompanyDescription = user.CompanyDescription,
            KycReviewedBy = user.KycReviewedBy,
            KycReviewedAt = user.KycReviewedAt,
            KycRejectionReason = user.KycRejectionReason,
            UnmaskedPhone = user.PhoneNumber,
            ActiveJobsCount = activeJobsCount,
            WalletBalance = wallet?.Balance ?? 0
        };

        // Lấy lịch sử AuditLog liên quan đến user này
        var auditLogs = await _dbContext.AuditLogs
            .AsNoTracking()
            .Where(a => a.ActionText.Contains($"#{userId}") || a.ActionText.Contains(user.Email))
            .OrderByDescending(a => a.CreatedAt)
            .Take(15)
            .ToListAsync(ct);

        dto.History = auditLogs.Select(a =>
        {
            var rawText = a.ActionText.Trim();
            var colonIdx = rawText.IndexOf(':');
            var rawAction = colonIdx > 0 ? rawText.Substring(0, colonIdx).Trim() : "AUDIT";
            var rawDetails = colonIdx > 0 ? rawText.Substring(colonIdx + 1).Trim() : rawText;

            while (rawDetails.StartsWith(rawAction, StringComparison.OrdinalIgnoreCase))
            {
                var nextColon = rawDetails.IndexOf(':');
                rawDetails = nextColon >= 0 ? rawDetails.Substring(nextColon + 1).Trim() : rawDetails.Trim();
            }

            var actionDisplay = rawAction switch
            {
                "ADJUST_RELIABILITY" => "Điều chỉnh điểm uy tín",
                "LOCK_USER" => "Khóa tài khoản",
                "UNLOCK_USER" => "Mở khóa tài khoản",
                "VERIFY_KYC" => "Phê duyệt eKYC",
                "BLACKLIST_USER" => "Đưa vào Blacklist",
                "UNBLACKLIST_USER" => "Gỡ khỏi Blacklist",
                "STUDENT_VERIFICATION" => "Duyệt thẻ sinh viên",
                _ => rawAction
            };

            return new AdminUserActivityHistoryDto
            {
                Time = a.CreatedAt.ToString("dd/MM/yyyy HH:mm"),
                Action = actionDisplay,
                Note = rawDetails
            };
        }).ToList();

        return dto;
    }

    public async Task<AdminUserListItemDto> ToggleLockUserAsync(int adminUserId, int targetUserId, AdminLockUserRequest request, CancellationToken ct = default)
    {
        var user = await _dbContext.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == targetUserId, ct);

        if (user == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy người dùng #{targetUserId}.");
        }

        // Q-010: Cấm tự thao tác trên chính tài khoản của mình
        if (adminUserId == targetUserId)
        {
            throw new BusinessException("Không thể tự khóa tài khoản của chính mình (Q-010 / INV-ADM-02).");
        }

        // INV-ADM-06: Khóa Root Admin Bất Tử
        if (user.Role?.Type == "admin" || user.Role?.Code == "super_admin" || user.Email == "admin@skillbridge.vn")
        {
            throw new BusinessException("Không thể khóa tài khoản Quản trị viên hệ thống (INV-ADM-06).");
        }

        var isLocking = user.AccountStatus != "locked";
        user.AccountStatus = isLocking ? "locked" : "active";

        if (isLocking)
        {
            // Q-005 / BR-ADM-05: Tăng TokenVersion hủy phiên ngay lập tức
            user.TokenVersion++;
        }

        var actorId = await EnsureAdminMemberIdAsync(adminUserId, ct);
        var actionText = isLocking
            ? $"LOCK_USER: Admin #{adminUserId} đã khóa tài khoản #{targetUserId} ({user.FullName}). Lý do: {request?.Reason ?? "Vi phạm điều khoản"}"
            : $"UNLOCK_USER: Admin #{adminUserId} đã mở khóa tài khoản #{targetUserId} ({user.FullName}).";

        await _dbContext.AuditLogs.AddAsync(new AuditLog
        {
            ActorId = actorId,
            ActionText = actionText,
            CreatedAt = DateTime.UtcNow
        }, ct);

        await _dbContext.SaveChangesAsync(ct);
        _logger.LogInformation("Admin {AdminId} {Action} user {UserId}", adminUserId, isLocking ? "khóa" : "mở khóa", targetUserId);

        return MapToListItemDto(user);
    }

    public async Task<AdminUserListItemDto> BlacklistUserAsync(int adminUserId, int targetUserId, AdminBlacklistRequest request, CancellationToken ct = default)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Reason))
        {
            throw new BusinessException("Lý do đưa vào Blacklist không được để trống (BR-ADM-06).");
        }

        var user = await _dbContext.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == targetUserId, ct);

        if (user == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy người dùng #{targetUserId}.");
        }

        if (user.Role?.Type == "admin" || user.Role?.Code == "super_admin" || user.Email == "admin@skillbridge.vn")
        {
            throw new BusinessException("Không thể đưa tài khoản Quản trị viên vào Blacklist (INV-ADM-06).");
        }

        user.AccountStatus = "blacklisted";
        user.BlacklistReason = request.Reason.Trim();
        user.TokenVersion++; // Hủy phiên ngay lập tức

        var actorId = await EnsureAdminMemberIdAsync(adminUserId, ct);
        await _dbContext.AuditLogs.AddAsync(new AuditLog
        {
            ActorId = actorId,
            ActionText = $"BLACKLIST_USER: Admin #{adminUserId} đưa người dùng #{targetUserId} ({user.FullName}) vào Blacklist vĩnh viễn. Lý do: {request.Reason.Trim()}",
            CreatedAt = DateTime.UtcNow
        }, ct);

        await _dbContext.SaveChangesAsync(ct);
        _logger.LogWarning("Admin {AdminId} đưa user {UserId} vào Blacklist", adminUserId, targetUserId);

        return MapToListItemDto(user);
    }

    public async Task<AdminUserListItemDto> RemoveFromBlacklistAsync(int adminUserId, int targetUserId, CancellationToken ct = default)
    {
        var user = await _dbContext.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == targetUserId, ct);

        if (user == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy người dùng #{targetUserId}.");
        }

        if (user.AccountStatus != "blacklisted")
        {
            throw new BusinessException("Người dùng hiện không nằm trong danh sách Blacklist.");
        }

        user.AccountStatus = "active";
        user.BlacklistReason = null;

        var actorId = await EnsureAdminMemberIdAsync(adminUserId, ct);
        await _dbContext.AuditLogs.AddAsync(new AuditLog
        {
            ActorId = actorId,
            ActionText = $"REMOVE_BLACKLIST: Admin #{adminUserId} gỡ người dùng #{targetUserId} ({user.FullName}) khỏi Blacklist.",
            CreatedAt = DateTime.UtcNow
        }, ct);

        await _dbContext.SaveChangesAsync(ct);
        return MapToListItemDto(user);
    }

    public async Task<AdminUserListItemDto> AdjustReliabilityAsync(int adminUserId, int targetUserId, AdminAdjustReliabilityRequest request, CancellationToken ct = default)
    {
        if (request == null) throw new ArgumentNullException(nameof(request));

        // BR-ADM-07: Bắt buộc lý do >= 10 ký tự
        if (string.IsNullOrWhiteSpace(request.Note) || request.Note.Trim().Length < 10)
        {
            throw new BusinessException("Căn cứ điều chỉnh điểm uy tín bắt buộc phải có ít nhất 10 ký tự để lưu Audit Log (BR-ADM-07).");
        }

        var user = await _dbContext.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == targetUserId, ct);

        if (user == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy người dùng #{targetUserId}.");
        }

        // BR-ADM-07: Biên độ tối đa +-20 điểm một lần
        var oldScore = user.ReliabilityScore;
        var delta = request.Value - oldScore;
        if (Math.Abs(delta) > 20)
        {
            throw new BusinessException($"Biên độ điều chỉnh điểm uy tín tối đa là ±20 điểm một lần (Điểm hiện tại: {oldScore}, Điểm yêu cầu: {request.Value}).");
        }

        var newScore = Math.Max(0, Math.Min(100, request.Value));
        user.ReliabilityScore = newScore;

        var actorId = await EnsureAdminMemberIdAsync(adminUserId, ct);
        await _dbContext.AuditLogs.AddAsync(new AuditLog
        {
            ActorId = actorId,
            ActionText = $"ADJUST_RELIABILITY: Admin #{adminUserId} điều chỉnh Reliability của #{targetUserId} ({user.FullName}) từ {oldScore} thành {newScore}. Căn cứ: {request.Note.Trim()}",
            CreatedAt = DateTime.UtcNow
        }, ct);

        await _dbContext.SaveChangesAsync(ct);
        return MapToListItemDto(user);
    }

    public async Task<AdminUserListItemDto> VerifyKycAsync(int adminUserId, int targetUserId, CancellationToken ct = default)
    {
        var user = await _dbContext.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == targetUserId, ct);

        if (user == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy người dùng #{targetUserId}.");
        }

        user.KycStatus = "verified";
        user.KycReviewedBy = adminUserId;
        user.KycReviewedAt = DateTime.UtcNow;

        if (user.AccountStatus == "pending")
        {
            user.AccountStatus = "active";
        }

        var actorId = await EnsureAdminMemberIdAsync(adminUserId, ct);
        await _dbContext.AuditLogs.AddAsync(new AuditLog
        {
            ActorId = actorId,
            ActionText = $"VERIFY_KYC: Admin #{adminUserId} đã phê duyệt xác thực định danh (eKYC) cho người dùng #{targetUserId} ({user.FullName}).",
            CreatedAt = DateTime.UtcNow
        }, ct);

        await _dbContext.SaveChangesAsync(ct);
        return MapToListItemDto(user);
    }

    private static AdminUserListItemDto MapToListItemDto(User u)
    {
        return new AdminUserListItemDto
        {
            Id = u.Id,
            Name = u.FullName,
            Email = u.Email,
            Phone = MaskPhoneNumber(u.PhoneNumber),
            Role = u.Role?.Code ?? "user",
            Status = u.AccountStatus,
            Kyc = u.KycStatus,
            Reliability = u.ReliabilityScore,
            JobsDone = u.JobsDoneCount,
            School = u.School,
            Industry = u.Industry,
            AvatarUrl = u.AvatarUrl,
            BlacklistReason = u.BlacklistReason,
            JoinedAt = u.JoinedAt
        };
    }

    private static string MaskPhoneNumber(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone) || phone.Length < 6) return phone ?? string.Empty;
        var start = phone.Substring(0, 3);
        var end = phone.Substring(phone.Length - 3);
        return $"{start}***{end}";
    }

    private async Task<int> EnsureAdminMemberIdAsync(int adminUserId, CancellationToken ct)
    {
        var adminMember = await _dbContext.AdminTeamMembers
            .FirstOrDefaultAsync(a => a.Id == adminUserId, ct);

        if (adminMember != null) return adminMember.Id;

        var adminUser = await _dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == adminUserId, ct);

        if (adminUser != null)
        {
            adminMember = await _dbContext.AdminTeamMembers
                .FirstOrDefaultAsync(a => a.Email == adminUser.Email, ct);

            if (adminMember == null)
            {
                adminMember = new AdminTeamMember
                {
                    Name = adminUser.FullName ?? "Admin Member",
                    Email = adminUser.Email,
                    RoleId = adminUser.RoleId,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };
                await _dbContext.AdminTeamMembers.AddAsync(adminMember, ct);
                await _dbContext.SaveChangesAsync(ct);
            }

            return adminMember.Id;
        }

        var defaultAdmin = await _dbContext.AdminTeamMembers.FirstOrDefaultAsync(ct);
        if (defaultAdmin != null) return defaultAdmin.Id;

        var newAdmin = new AdminTeamMember
        {
            Name = "System SuperAdmin",
            Email = "admin@skillbridge.vn",
            RoleId = 1,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        await _dbContext.AdminTeamMembers.AddAsync(newAdmin, ct);
        await _dbContext.SaveChangesAsync(ct);
        return newAdmin.Id;
    }
}
