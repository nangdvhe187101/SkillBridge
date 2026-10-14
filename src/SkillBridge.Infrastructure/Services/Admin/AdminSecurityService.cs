using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.DTOs.Admin;
using SkillBridge.Application.Interfaces.Admin;
using SkillBridge.Application.Interfaces.Storage;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Services.Admin;

public class AdminSecurityService : IAdminSecurityService
{
    private readonly SkillBridgeDbContext _dbContext;
    private readonly IStorageService _storageService;
    private readonly ILogger<AdminSecurityService> _logger;

    public AdminSecurityService(
        SkillBridgeDbContext dbContext,
        IStorageService storageService,
        ILogger<AdminSecurityService> logger)
    {
        _dbContext = dbContext;
        _storageService = storageService;
        _logger = logger;
    }

    public async Task RecordLoginEventAsync(
        int userId,
        string action,
        string? ipAddress,
        string? userAgent,
        string method,
        CancellationToken ct = default)
    {
        try
        {
            var metadataObj = new
            {
                method,
                recordedAt = DateTime.UtcNow
            };

            var log = new SecurityLog
            {
                UserId = userId,
                Action = string.IsNullOrWhiteSpace(action) ? "LOGIN_SUCCESS" : action,
                IpAddress = string.IsNullOrWhiteSpace(ipAddress) ? "Unknown" : ipAddress.Trim(),
                UserAgent = string.IsNullOrWhiteSpace(userAgent) ? "Unknown" : (userAgent.Length > 255 ? userAgent.Substring(0, 255) : userAgent),
                Metadata = JsonSerializer.Serialize(metadataObj),
                CreatedAt = DateTime.UtcNow
            };

            await _dbContext.SecurityLogs.AddAsync(log, ct);
            await _dbContext.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Không thể ghi nhật ký đăng nhập cho UserId #{UserId}: {Message}", userId, ex.Message);
        }
    }

    public async Task<AdminLoginHistoryPagedResultDto> GetLoginHistoryAsync(
        string? role,
        string? searchTerm,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 5, 100);

        var query = _dbContext.SecurityLogs
            .AsNoTracking()
            .Include(l => l.User)
                .ThenInclude(u => u.Role)
            .Where(l => l.Action.StartsWith("LOGIN_") || l.Action == "LOGIN_SUCCESS");

        // Lọc theo vai trò (role)
        if (!string.IsNullOrWhiteSpace(role) && !string.Equals(role, "all", StringComparison.OrdinalIgnoreCase))
        {
            var r = role.Trim().ToLowerInvariant();
            query = query.Where(l => l.User.Role.Code.ToLower() == r ||
                                     l.User.Role.Type.ToLower() == r);
        }

        // Tìm kiếm theo từ khóa (Email, Họ tên, IP)
        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(l =>
                l.User.Email.ToLower().Contains(term) ||
                l.User.FullName.ToLower().Contains(term) ||
                (l.IpAddress != null && l.IpAddress.ToLower().Contains(term)));
        }

        var total = await query.CountAsync(ct);

        var itemsRaw = await query
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var items = itemsRaw.Select(l =>
        {
            var method = "password";
            if (!string.IsNullOrWhiteSpace(l.Metadata))
            {
                try
                {
                    using var doc = JsonDocument.Parse(l.Metadata);
                    if (doc.RootElement.TryGetProperty("method", out var methodProp))
                    {
                        method = methodProp.GetString() ?? "password";
                    }
                }
                catch { }
            }

            var roleCode = l.User?.Role?.Code ?? "unknown";
            var roleName = roleCode switch
            {
                "student" => "Sinh viên",
                "employer" => "Nhà tuyển dụng",
                "admin" or "super_admin" or "super" => "Quản trị viên",
                "moderator" => "Kiểm duyệt viên",
                "dispute" => "Xử lý tranh chấp",
                "finance" => "Kế toán / Tài chính",
                _ => l.User?.Role?.Name ?? roleCode
            };

            return new AdminLoginHistoryItemDto
            {
                Id = l.Id,
                UserId = l.UserId,
                FullName = l.User?.FullName ?? "N/A",
                Email = l.User?.Email ?? "N/A",
                Role = roleCode,
                RoleName = roleName,
                AvatarUrl = _storageService.GetPublicUrl(l.User?.AvatarUrl),
                IpAddress = l.IpAddress,
                UserAgent = l.UserAgent,
                Method = method,
                LoginAt = l.CreatedAt
            };
        }).ToList();

        return new AdminLoginHistoryPagedResultDto
        {
            Total = total,
            Page = page,
            PageSize = pageSize,
            Items = items
        };
    }

    public async Task<AdminLoginStatsDto> GetLoginStatsAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var startOfToday = new DateTime(now.Year, now.Month, now.Day, 0, 0, 0, DateTimeKind.Utc);
        var last24h = now.AddHours(-24);

        var query = _dbContext.SecurityLogs
            .AsNoTracking()
            .Include(l => l.User)
                .ThenInclude(u => u.Role)
            .Where(l => l.Action.StartsWith("LOGIN_") || l.Action == "LOGIN_SUCCESS");

        var todayLogs = await query
            .Where(l => l.CreatedAt >= startOfToday)
            .Select(l => new { l.UserId, RoleCode = l.User.Role.Code, RoleType = l.User.Role.Type })
            .ToListAsync(ct);

        var activeUsers24h = await query
            .Where(l => l.CreatedAt >= last24h)
            .Select(l => l.UserId)
            .Distinct()
            .CountAsync(ct);

        var studentsToday = todayLogs.Count(l => l.RoleCode == "student");
        var employersToday = todayLogs.Count(l => l.RoleCode == "employer");
        var adminsToday = todayLogs.Count(l => l.RoleType == "admin" || l.RoleCode == "admin" || l.RoleCode == "super_admin");

        return new AdminLoginStatsDto
        {
            TotalToday = todayLogs.Count,
            ActiveUsers24h = activeUsers24h,
            StudentsToday = studentsToday,
            EmployersToday = employersToday,
            AdminsToday = adminsToday
        };
    }
}
