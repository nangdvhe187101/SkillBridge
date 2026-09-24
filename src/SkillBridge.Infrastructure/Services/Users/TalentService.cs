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
using SkillBridge.Application.Interfaces.Applications;
using SkillBridge.Application.Interfaces.Notifications;
using SkillBridge.Application.Interfaces.Storage;
using SkillBridge.Application.Interfaces.Users;
using SkillBridge.Infrastructure.Data;

namespace SkillBridge.Infrastructure.Services.Users;

public class TalentService : ITalentService
{
    private readonly SkillBridgeDbContext _dbContext;
    private readonly IStorageService _storageService;
    private readonly INotificationService _notificationService;
    private readonly ILogger<TalentService> _logger;

    public TalentService(
        SkillBridgeDbContext dbContext,
        IStorageService storageService,
        INotificationService notificationService,
        ILogger<TalentService> logger)
    {
        _dbContext = dbContext;
        _storageService = storageService;
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task<PagedResult<TalentItemDto>> GetTalentsAsync(TalentFilterRequest request, CancellationToken ct = default)
    {
        var page = request.Page <= 0 ? 1 : request.Page;
        var pageSize = request.PageSize <= 0 ? 12 : Math.Min(request.PageSize, 50);

        var query = _dbContext.Users
            .AsNoTracking()
            .Include(u => u.Role)
            .Where(u => u.Role.Code == "student" && u.AccountStatus == "active");

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            var kw = request.Keyword.Trim();
            query = query.Where(u =>
                EF.Functions.Like(u.FullName, $"%{kw}%") ||
                (u.School != null && EF.Functions.Like(u.School, $"%{kw}%")) ||
                (u.Industry != null && EF.Functions.Like(u.Industry, $"%{kw}%")) ||
                (u.CompanyDescription != null && EF.Functions.Like(u.CompanyDescription, $"%{kw}%")));
        }

        if (!string.IsNullOrWhiteSpace(request.School))
        {
            var sch = request.School.Trim();
            query = query.Where(u => u.School != null && EF.Functions.Like(u.School, $"%{sch}%"));
        }

        if (!string.IsNullOrWhiteSpace(request.Industry))
        {
            var ind = request.Industry.Trim();
            query = query.Where(u => u.Industry != null && EF.Functions.Like(u.Industry, $"%{ind}%"));
        }

        if (request.MinReliabilityScore.HasValue)
        {
            query = query.Where(u => u.ReliabilityScore >= request.MinReliabilityScore.Value);
        }

        var totalCount = await query.CountAsync(ct);

        var rawUsers = await query
            .OrderByDescending(u => u.ReliabilityScore)
            .ThenByDescending(u => u.JobsDoneCount)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var userIds = rawUsers.Select(u => u.Id).ToList();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var activeSubs = await _dbContext.Subscriptions
            .AsNoTracking()
            .Where(s => userIds.Contains(s.UserId)
                     && s.Status == PaymentConstants.ActiveSubscriptionStatus
                     && (s.RenewalDate == null || s.RenewalDate >= today))
            .ToListAsync(ct);

        // Lấy danh sách kỹ năng từ các CV của sinh viên (nếu có)
        var userCvs = await _dbContext.CvFiles
            .AsNoTracking()
            .Include(c => c.Category)
            .Where(c => userIds.Contains(c.StudentId))
            .Select(c => new { c.StudentId, Label = c.Label ?? string.Empty, Name = c.Category != null ? c.Category.Name : string.Empty })
            .ToListAsync(ct);

        var items = rawUsers.Select(u =>
        {
            var sub = activeSubs.FirstOrDefault(s => s.UserId == u.Id);
            int tier = 0;
            string? planCode = null;
            if (sub != null)
            {
                var p = sub.PlanName.ToUpperInvariant();
                if (p.Contains("MASTER")) { tier = 3; planCode = "STU_MASTER"; }
                else if (p.Contains("PRO")) { tier = 2; planCode = "STU_PRO"; }
                else if (p.Contains("STARTER")) { tier = 1; planCode = "STU_STARTER"; }
            }

            var skills = userCvs
                .Where(c => c.StudentId == u.Id)
                .SelectMany(c => new[] { c.Label, c.Name })
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Distinct()
                .Take(4)
                .ToList();

            return new TalentItemDto
            {
                Id = u.Id,
                FullName = u.FullName,
                AvatarUrl = _storageService.GetPublicUrl(u.AvatarUrl),
                School = u.School,
                Industry = u.Industry,
                CompanyDescription = u.CompanyDescription,
                ReliabilityScore = u.ReliabilityScore,
                JobsDoneCount = u.JobsDoneCount,
                KycStatus = u.KycStatus ?? "verified",
                ActivePlanCode = planCode,
                ActivePlanTier = tier,
                JoinedAt = u.JoinedAt,
                Skills = skills
            };
        })
        .OrderByDescending(x => x.ActivePlanTier)
        .ThenByDescending(x => x.ReliabilityScore)
        .ThenByDescending(x => x.JobsDoneCount)
        .ToList();

        return new PagedResult<TalentItemDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<InviteToJobResponseDto> InviteStudentToJobAsync(int employerId, int studentId, InviteToJobRequest request, CancellationToken ct = default)
    {
        var job = await _dbContext.Jobs
            .Include(j => j.Employer)
            .FirstOrDefaultAsync(j => j.Id == request.JobId, ct);

        if (job == null)
        {
            throw new BusinessException("Công việc không tồn tại.");
        }

        if (job.EmployerId != employerId)
        {
            throw new BusinessException("Bạn chỉ có thể mời ứng viên vào các công việc do chính mình đăng.");
        }

        if (job.Status != "open")
        {
            throw new BusinessException("Công việc này hiện không còn nhận hồ sơ ứng tuyển.");
        }

        var student = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == studentId, ct);
        if (student == null)
        {
            throw new BusinessException("Không tìm thấy thông tin sinh viên.");
        }

        var hasApplied = await _dbContext.Applications
            .AnyAsync(a => a.JobId == job.Id && a.StudentId == studentId && a.Status != "cancelled" && a.Status != "rejected", ct);

        if (hasApplied)
        {
            throw new BusinessException("Sinh viên này đã nộp hồ sơ ứng tuyển cho công việc này rồi.");
        }

        var employerName = job.Employer?.FullName ?? "Nhà tuyển dụng";
        var customMsg = string.IsNullOrWhiteSpace(request.Message) ? string.Empty : $" Lời nhắn: \"{request.Message.Trim()}\"";

        await _notificationService.SendAsync(
            studentId,
            "briefcase",
            $"Nhà tuyển dụng {employerName} đã gửi lời mời bạn ứng tuyển công việc: \"{job.Title}\".{customMsg}",
            $"/jobs/{job.Id}",
            ct);

        _logger.LogInformation("Employer {EmployerId} đã gửi lời mời ứng tuyển Job #{JobId} cho Student {StudentId}.",
            employerId, job.Id, studentId);

        return new InviteToJobResponseDto
        {
            Success = true,
            Message = $"Đã gửi lời mời ứng tuyển công việc '{job.Title}' đến {student.FullName} thành công!",
            InvitedAt = DateTime.UtcNow
        };
    }
}
