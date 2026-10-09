using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Admin;
using SkillBridge.Application.DTOs.Jobs;
using SkillBridge.Application.Interfaces.Admin;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Services.Admin;

public class AdminContentService : IAdminContentService
{
    private readonly SkillBridgeDbContext _dbContext;
    private readonly ILogger<AdminContentService> _logger;

    public AdminContentService(SkillBridgeDbContext dbContext, ILogger<AdminContentService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task<PagedResult<AdminModerationItemDto>> GetModerationQueueAsync(AdminModerationFilterRequest filter, CancellationToken ct = default)
    {
        var query = _dbContext.ModerationQueues
            .AsNoTracking()
            .Include(m => m.Job)
                .ThenInclude(j => j.Employer)
            .Include(m => m.Job)
                .ThenInclude(j => j.Category)
            .Include(m => m.Job)
                .ThenInclude(j => j.JobRequirements)
            .Include(m => m.Job)
                .ThenInclude(j => j.Attachments)
            .AsQueryable();

        // 1. Lọc theo Status
        if (!string.IsNullOrWhiteSpace(filter.Status) && !string.Equals(filter.Status, "all", StringComparison.OrdinalIgnoreCase))
        {
            var statusFilter = filter.Status.ToLowerInvariant();
            query = query.Where(m => m.Status != null && m.Status.ToLower() == statusFilter);
        }

        // 2. Tìm kiếm từ khóa (Tiêu đề tin, Tên NTD, Email NTD, Tên danh mục)
        if (!string.IsNullOrWhiteSpace(filter.Query))
        {
            var keyword = filter.Query.Trim().ToLower();
            query = query.Where(m =>
                (m.Job != null && m.Job.Title != null && m.Job.Title.ToLower().Contains(keyword)) ||
                (m.Job != null && m.Job.Employer != null && m.Job.Employer.FullName != null && m.Job.Employer.FullName.ToLower().Contains(keyword)) ||
                (m.Job != null && m.Job.Employer != null && m.Job.Employer.Email != null && m.Job.Employer.Email.ToLower().Contains(keyword)) ||
                (m.Job != null && m.Job.Category != null && m.Job.Category.Name != null && m.Job.Category.Name.ToLower().Contains(keyword)));
        }

        var list = await query
            .OrderByDescending(m => m.SubmittedAt)
            .ToListAsync(ct);

        // Đánh giá mức độ rủi ro (Risk calculation: high | med | low)
        var evaluatedItems = list.Select(m =>
        {
            var risk = EvaluateRisk(m);
            return new AdminModerationItemDto
            {
                Id = m.Id,
                JobId = m.JobId,
                Title = m.Job?.Title ?? "Chưa đặt tiêu đề",
                EmployerId = m.Job?.EmployerId ?? 0,
                EmployerName = m.Job?.Employer?.FullName ?? "N/A",
                EmployerEmail = m.Job?.Employer?.Email ?? "N/A",
                CategoryName = m.Job?.Category?.Name ?? "Chưa phân loại",
                Budget = m.Job?.Budget ?? 0,
                Description = m.Job?.Description ?? string.Empty,
                FlagReason = m.FlagReason,
                Risk = risk,
                Status = m.Status,
                SubmittedAt = m.SubmittedAt,
                ReviewedAt = m.ReviewedAt,
                ReviewedBy = m.ReviewedBy,
                Attachments = m.Job?.Attachments?.Where(a => a.FileUrl != null).Select(a => a.FileUrl!).ToList() ?? new List<string>(),
                Requirements = m.Job?.JobRequirements?.Where(r => r.RequirementText != null).Select(r => r.RequirementText!).ToList() ?? new List<string>()
            };
        }).ToList();

        // 3. Lọc theo Risk nếu có
        if (!string.IsNullOrWhiteSpace(filter.Risk) && !string.Equals(filter.Risk, "all", StringComparison.OrdinalIgnoreCase))
        {
            evaluatedItems = evaluatedItems.Where(i => string.Equals(i.Risk, filter.Risk, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        var totalCount = evaluatedItems.Count;
        var pagedItems = evaluatedItems
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToList();

        return new PagedResult<AdminModerationItemDto>
        {
            Items = pagedItems,
            TotalCount = totalCount,
            Page = filter.Page,
            PageSize = filter.PageSize
        };
    }

    public async Task<AdminContentStatsDto> GetContentStatsAsync(CancellationToken ct = default)
    {
        var pendingJobs = await _dbContext.ModerationQueues
            .AsNoTracking()
            .Where(m => m.Status == "pending")
            .ToListAsync(ct);

        var pendingJobsCount = pendingJobs.Count;
        var highRiskCount = pendingJobs.Count(m => EvaluateRisk(m) == "high");
        var totalCategoriesCount = await _dbContext.Categories.CountAsync(ct);
        var featuredRequestsCount = await _dbContext.FeaturedRequests
            .CountAsync(f => f.Status == "pending", ct);

        return new AdminContentStatsDto
        {
            PendingJobsCount = pendingJobsCount,
            HighRiskCount = highRiskCount,
            TotalCategoriesCount = totalCategoriesCount,
            FeaturedRequestsCount = featuredRequestsCount
        };
    }

    public async Task<bool> ApproveJobAsync(int adminUserId, int jobId, AdminApproveJobRequest? request, CancellationToken ct = default)
    {
        var job = await _dbContext.Jobs
            .Include(j => j.Employer)
            .FirstOrDefaultAsync(j => j.Id == jobId, ct);

        if (job == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy tin tuyển dụng mang mã #{jobId}.");
        }

        var actorId = await EnsureAdminMemberIdAsync(adminUserId, ct);

        // Cập nhật trạng thái job sang 'open' để hiển thị công khai cho sinh viên
        job.Status = "open";
        job.UpdatedAt = DateTime.UtcNow;

        // Cập nhật bản ghi kiểm duyệt trong ModerationQueue nếu có
        var modItem = await _dbContext.ModerationQueues
            .FirstOrDefaultAsync(m => m.JobId == jobId && m.Status == "pending", ct);

        if (modItem != null)
        {
            modItem.Status = "approved";
            modItem.ReviewedAt = DateTime.UtcNow;
            modItem.ReviewedBy = actorId;
        }

        // Ghi Audit Log bất biến
        await _dbContext.AuditLogs.AddAsync(new AuditLog
        {
            ActorId = actorId,
            ActionText = $"APPROVE_JOB: Admin #{adminUserId} đã phê duyệt tin tuyển dụng #{jobId} ('{job.Title}') của NTD #{job.EmployerId}. Ghi chú: {request?.Note ?? "Nội dung hợp lệ"}",
            CreatedAt = DateTime.UtcNow
        }, ct);

        // Gửi thông báo cho Nhà tuyển dụng
        await _dbContext.Notifications.AddAsync(new Notification
        {
            UserId = job.EmployerId,
            Icon = "check",
            MessageText = $"Tin tuyển dụng '{job.Title}' của bạn đã được kiểm duyệt và đăng tải công khai trên SkillBridge.",
            Link = $"/jobs/{job.Id}",
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        }, ct);

        await _dbContext.SaveChangesAsync(ct);
        _logger.LogInformation("Admin {AdminId} đã duyệt tin đăng {JobId}", adminUserId, jobId);
        return true;
    }

    public async Task<bool> RejectJobAsync(int adminUserId, int jobId, AdminRejectJobRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Trim().Length < 5)
        {
            throw new BusinessException("Lý do từ chối tin đăng phải có tối thiểu 5 ký tự.");
        }

        var job = await _dbContext.Jobs
            .Include(j => j.Employer)
            .FirstOrDefaultAsync(j => j.Id == jobId, ct);

        if (job == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy tin tuyển dụng mang mã #{jobId}.");
        }

        var actorId = await EnsureAdminMemberIdAsync(adminUserId, ct);

        job.Status = "cancelled";
        job.UpdatedAt = DateTime.UtcNow;

        var modItem = await _dbContext.ModerationQueues
            .FirstOrDefaultAsync(m => m.JobId == jobId && m.Status == "pending", ct);

        if (modItem != null)
        {
            modItem.Status = "rejected";
            modItem.ReviewedAt = DateTime.UtcNow;
            modItem.ReviewedBy = actorId;
        }

        // Ghi Audit Log bất biến
        await _dbContext.AuditLogs.AddAsync(new AuditLog
        {
            ActorId = actorId,
            ActionText = $"REJECT_JOB: Admin #{adminUserId} đã từ chối tin tuyển dụng #{jobId} ('{job.Title}'). Lý do: {request.Reason.Trim()}",
            CreatedAt = DateTime.UtcNow
        }, ct);

        // Gửi thông báo từ chối kèm lý do cho NTD
        await _dbContext.Notifications.AddAsync(new Notification
        {
            UserId = job.EmployerId,
            Icon = "ban",
            MessageText = $"Tin tuyển dụng '{job.Title}' đã bị từ chối phê duyệt. Lý do: {request.Reason.Trim()}",
            Link = $"/employer/jobs/{job.Id}",
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        }, ct);

        await _dbContext.SaveChangesAsync(ct);
        _logger.LogInformation("Admin {AdminId} từ chối tin đăng {JobId}", adminUserId, jobId);
        return true;
    }

    public async Task<bool> WarnPosterAsync(int adminUserId, int jobId, AdminWarnPosterRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.WarningMessage) || request.WarningMessage.Trim().Length < 5)
        {
            throw new BusinessException("Nội dung cảnh báo NTD phải có tối thiểu 5 ký tự.");
        }

        var job = await _dbContext.Jobs
            .Include(j => j.Employer)
            .FirstOrDefaultAsync(j => j.Id == jobId, ct);

        if (job == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy tin tuyển dụng mang mã #{jobId}.");
        }

        var actorId = await EnsureAdminMemberIdAsync(adminUserId, ct);

        // Gửi cảnh báo vi phạm tới NTD
        await _dbContext.Notifications.AddAsync(new Notification
        {
            UserId = job.EmployerId,
            Icon = "warning",
            MessageText = $"Cảnh báo vi phạm nội dung tin '{job.Title}': {request.WarningMessage.Trim()}",
            Link = $"/employer/jobs/{job.Id}",
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        }, ct);

        // Ghi Audit Log bất biến
        await _dbContext.AuditLogs.AddAsync(new AuditLog
        {
            ActorId = actorId,
            ActionText = $"WARN_POSTER: Admin #{adminUserId} gửi cảnh báo tới NTD #{job.EmployerId} về tin #{jobId}. Nội dung: {request.WarningMessage.Trim()}",
            CreatedAt = DateTime.UtcNow
        }, ct);

        await _dbContext.SaveChangesAsync(ct);
        _logger.LogInformation("Admin {AdminId} gửi cảnh báo NTD cho tin đăng {JobId}", adminUserId, jobId);
        return true;
    }

    public async Task<List<AdminCategoryDto>> GetCategoriesAsync(CancellationToken ct = default)
    {
        var categories = await _dbContext.Categories
            .AsNoTracking()
            .Select(c => new AdminCategoryDto
            {
                Id = c.Id,
                Name = c.Name,
                DefaultRevisionLimit = c.DefaultRevisionLimit,
                PreviewStrategy = c.PreviewStrategy,
                JobsCount = c.Jobs.Count
            })
            .OrderBy(c => c.Name)
            .ToListAsync(ct);

        return categories;
    }

    public async Task<AdminCategoryDto> CreateCategoryAsync(int adminUserId, AdminCreateCategoryRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new BusinessException("Tên danh mục ngành nghề không được để trống.");
        }

        var cleanName = request.Name.Trim();
        var existing = await _dbContext.Categories
            .AnyAsync(c => c.Name == cleanName, ct);

        if (existing)
        {
            throw new BusinessException($"Danh mục '{cleanName}' đã tồn tại trên hệ thống.");
        }

        var validStrategies = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "watermark_image", "watermark_video", "partial_text", "sample_rows"
        };
        var strategy = !string.IsNullOrWhiteSpace(request.PreviewStrategy) && validStrategies.Contains(request.PreviewStrategy.Trim())
            ? request.PreviewStrategy.Trim().ToLowerInvariant()
            : "watermark_image";

        var category = new Category
        {
            Name = cleanName,
            DefaultRevisionLimit = request.DefaultRevisionLimit > 0 ? request.DefaultRevisionLimit : 2,
            PreviewStrategy = strategy
        };

        await _dbContext.Categories.AddAsync(category, ct);
        await _dbContext.SaveChangesAsync(ct);

        var actorId = await EnsureAdminMemberIdAsync(adminUserId, ct);
        await _dbContext.AuditLogs.AddAsync(new AuditLog
        {
            ActorId = actorId,
            ActionText = $"CREATE_CATEGORY: Admin #{adminUserId} thêm danh mục ngành nghề mới #{category.Id} ('{category.Name}').",
            CreatedAt = DateTime.UtcNow
        }, ct);
        await _dbContext.SaveChangesAsync(ct);

        _logger.LogInformation("Admin {AdminId} tạo danh mục ngành nghề {CatId}", adminUserId, category.Id);

        return new AdminCategoryDto
        {
            Id = category.Id,
            Name = category.Name,
            DefaultRevisionLimit = category.DefaultRevisionLimit,
            PreviewStrategy = category.PreviewStrategy,
            JobsCount = 0
        };
    }

    public async Task<bool> DeleteCategoryAsync(int adminUserId, int categoryId, CancellationToken ct = default)
    {
        var category = await _dbContext.Categories
            .Include(c => c.Jobs)
            .FirstOrDefaultAsync(c => c.Id == categoryId, ct);

        if (category == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy danh mục mang mã #{categoryId}.");
        }

        if (category.Jobs.Any())
        {
            throw new BusinessException($"Không thể xóa danh mục '{category.Name}' vì đang có {category.Jobs.Count} tin tuyển dụng liên kết. Vui lòng chuyển các tin đăng sang ngành nghề khác trước.");
        }

        var categoryName = category.Name;
        _dbContext.Categories.Remove(category);

        var actorId = await EnsureAdminMemberIdAsync(adminUserId, ct);
        await _dbContext.AuditLogs.AddAsync(new AuditLog
        {
            ActorId = actorId,
            ActionText = $"DELETE_CATEGORY: Admin #{adminUserId} đã xóa danh mục ngành nghề #{categoryId} ('{categoryName}').",
            CreatedAt = DateTime.UtcNow
        }, ct);

        await _dbContext.SaveChangesAsync(ct);
        _logger.LogInformation("Admin {AdminId} xóa danh mục ngành nghề {CatId}", adminUserId, categoryId);
        return true;
    }

    public async Task<List<AdminFeaturedItemDto>> GetFeaturedRequestsAsync(CancellationToken ct = default)
    {
        var requests = await _dbContext.FeaturedRequests
            .AsNoTracking()
            .Include(f => f.Job)
            .Include(f => f.Employer)
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => new AdminFeaturedItemDto
            {
                Id = f.Id,
                JobId = f.JobId,
                JobTitle = f.Job != null ? f.Job.Title : "N/A",
                EmployerName = f.Employer != null ? f.Employer.FullName : "N/A",
                EmployerEmail = f.Employer != null ? f.Employer.Email : "N/A",
                PaidAmount = f.PaidAmount,
                Status = f.Status,
                CreatedAt = f.CreatedAt,
                ExpiresAt = (f.Job != null && f.Job.IsFeatured) ? (f.UpdatedAt ?? f.CreatedAt).AddDays(7) : null
            })
            .ToListAsync(ct);

        return requests;
    }

    public async Task<bool> ApproveFeaturedAsync(int adminUserId, int featuredRequestId, CancellationToken ct = default)
    {
        var featuredReq = await _dbContext.FeaturedRequests
            .Include(f => f.Job)
            .FirstOrDefaultAsync(f => f.Id == featuredRequestId, ct);

        if (featuredReq == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy yêu cầu tin nổi bật mang mã #{featuredRequestId}.");
        }

        var actorId = await EnsureAdminMemberIdAsync(adminUserId, ct);

        // Kích hoạt hạn 7 ngày theo quyết định nghiệp vụ Q-017
        featuredReq.Status = "approved";
        featuredReq.UpdatedAt = DateTime.UtcNow;

        if (featuredReq.Job != null)
        {
            featuredReq.Job.IsFeatured = true;
            featuredReq.Job.UpdatedAt = DateTime.UtcNow;
        }

        await _dbContext.AuditLogs.AddAsync(new AuditLog
        {
            ActorId = actorId,
            ActionText = $"APPROVE_FEATURED: Admin #{adminUserId} phê duyệt gói Featured Listing 7 ngày cho tin tuyển dụng #{featuredReq.JobId} ('{featuredReq.Job?.Title}'). Số tiền: {featuredReq.PaidAmount:N0}đ",
            CreatedAt = DateTime.UtcNow
        }, ct);

        await _dbContext.SaveChangesAsync(ct);
        _logger.LogInformation("Admin {AdminId} duyệt gói Featured #{FeaturedId} cho tin #{JobId}", adminUserId, featuredRequestId, featuredReq.JobId);
        return true;
    }

    private static string EvaluateRisk(ModerationQueue m)
    {
        var flag = m.FlagReason?.ToLower() ?? string.Empty;
        var budget = m.Job?.Budget ?? 0;

        if (flag.Contains("lừa đảo") || flag.Contains("scam") || flag.Contains("rửa tiền") ||
            flag.Contains("đặt cọc") || flag.Contains("nạp tiền") || flag.Contains("vi phạm pháp luật") ||
            budget > 50_000_000)
        {
            return "high";
        }

        if (!string.IsNullOrWhiteSpace(flag) || budget > 20_000_000)
        {
            return "med";
        }

        return "low";
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

        return 1;
    }
}
