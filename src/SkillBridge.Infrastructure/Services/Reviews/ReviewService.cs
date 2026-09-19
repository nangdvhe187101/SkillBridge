using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Reviews;
using SkillBridge.Application.Interfaces.Notifications;
using SkillBridge.Application.Interfaces.Reviews;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Services.Reviews;

public class ReviewService : IReviewService
{
    private readonly SkillBridgeDbContext _dbContext;
    private readonly INotificationService _notificationService;
    private readonly ILogger<ReviewService> _logger;

    public ReviewService(
        SkillBridgeDbContext dbContext,
        INotificationService notificationService,
        ILogger<ReviewService> logger)
    {
        _dbContext = dbContext;
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task<ReviewDto> CreateReviewAsync(int reviewerId, CreateReviewRequest request, CancellationToken cancellationToken = default)
    {
        if (request.Stars < 1 || request.Stars > 5)
        {
            throw new BusinessException("Số sao đánh giá phải từ 1 đến 5 sao.");
        }

        var job = await _dbContext.Jobs
            .Include(j => j.Employer)
            .Include(j => j.HiredApplicant)
            .FirstOrDefaultAsync(j => j.Id == request.JobId, cancellationToken);

        if (job == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy công việc #{request.JobId}.");
        }

        if (!string.Equals(job.Status, "completed", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(job.Status, "closed", StringComparison.OrdinalIgnoreCase))
        {
            throw new BusinessException("Chỉ có thể gửi đánh giá cho công việc đã hoàn thành nghiệm thu.");
        }

        int revieweeId;
        bool isFromEmployer;

        if (job.EmployerId == reviewerId)
        {
            if (!job.HiredApplicantId.HasValue)
            {
                throw new BusinessException("Công việc này chưa có sinh viên thực hiện để đánh giá.");
            }
            revieweeId = job.HiredApplicantId.Value;
            isFromEmployer = true;
        }
        else if (job.HiredApplicantId == reviewerId)
        {
            revieweeId = job.EmployerId;
            isFromEmployer = false;
        }
        else
        {
            throw new UnauthorizedAccessException("Bạn không có quyền đánh giá công việc này.");
        }

        var alreadyReviewed = await _dbContext.Reviews
            .AnyAsync(r => r.JobId == request.JobId && r.ReviewerId == reviewerId, cancellationToken);

        if (alreadyReviewed)
        {
            throw new BusinessException("Bạn đã gửi đánh giá cho công việc này rồi.");
        }

        var review = new Review
        {
            JobId = request.JobId,
            ReviewerId = reviewerId,
            RevieweeId = revieweeId,
            Stars = (sbyte)request.Stars,
            Comment = string.IsNullOrWhiteSpace(request.Comment) ? null : request.Comment.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Reviews.Add(review);

        // Cập nhật điểm uy tín cho đối phương
        var reviewee = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == revieweeId, cancellationToken);
        if (reviewee != null)
        {
            var oldScore = reviewee.ReliabilityScore;
            if (request.Stars >= 5)
            {
                reviewee.ReliabilityScore = Math.Min(100, reviewee.ReliabilityScore + 2);
            }
            else if (request.Stars == 4)
            {
                reviewee.ReliabilityScore = Math.Min(100, reviewee.ReliabilityScore + 1);
            }
            else if (request.Stars <= 2)
            {
                reviewee.ReliabilityScore = Math.Max(0, reviewee.ReliabilityScore - 3);
            }
            _logger.LogInformation("Người dùng #{UserId} được cập nhật điểm uy tín từ {OldScore} -> {NewScore} sau khi nhận đánh giá {Stars} sao.",
                revieweeId, oldScore, reviewee.ReliabilityScore, request.Stars);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        // Gửi thông báo realtime đến đối phương
        try
        {
            var reviewer = await _dbContext.Users.FindAsync(new object[] { reviewerId }, cancellationToken);
            var reviewerName = reviewer?.FullName ?? (isFromEmployer ? "Nhà tuyển dụng" : "Sinh viên");
            var notifMsg = isFromEmployer
                ? $"{reviewerName} đã đánh giá {request.Stars}⭐ cho bạn trong công việc \"{job.Title}\"."
                : $"{reviewerName} đã đánh giá {request.Stars}⭐ về bạn cho công việc \"{job.Title}\".";
            var notifLink = isFromEmployer ? "/student/my-work" : $"/employer/jobs/{job.Id}";

            // 1. Gửi thông báo đến người nhận đánh giá (reviewee)
            await _notificationService.SendAsync(revieweeId, "star", notifMsg, notifLink, cancellationToken);

            // 2. Gửi thông báo xác nhận đến chính người gửi đánh giá (reviewer)
            var reviewerConfirmMsg = isFromEmployer
                ? $"Bạn đã gửi đánh giá {request.Stars}⭐ cho sinh viên {reviewee?.FullName ?? "ứng viên"} trong công việc \"{job.Title}\"."
                : $"Bạn đã gửi đánh giá {request.Stars}⭐ cho nhà tuyển dụng {job.Employer?.FullName ?? "đối tác"} trong công việc \"{job.Title}\".";
            var reviewerLink = isFromEmployer ? $"/employer/jobs/{job.Id}" : "/student/my-work";
            await _notificationService.SendAsync(reviewerId, "check", reviewerConfirmMsg, reviewerLink, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Không thể gửi thông báo đánh giá cho user #{UserId}", revieweeId);
        }

        var reviewerUser = await _dbContext.Users.FindAsync(new object[] { reviewerId }, cancellationToken);

        return new ReviewDto
        {
            Id = review.Id,
            JobId = job.Id,
            JobTitle = job.Title,
            ReviewerId = reviewerId,
            ReviewerName = reviewerUser?.FullName ?? (isFromEmployer ? "Nhà tuyển dụng" : "Sinh viên"),
            ReviewerAvatar = reviewerUser?.AvatarUrl,
            RevieweeId = revieweeId,
            RevieweeName = reviewee?.FullName ?? "Đối tác",
            RevieweeAvatar = reviewee?.AvatarUrl,
            Stars = review.Stars,
            Comment = review.Comment,
            CreatedAt = review.CreatedAt,
            IsFromEmployer = isFromEmployer
        };
    }

    public async Task<JobReviewsSummaryDto> GetJobReviewsAsync(int jobId, int? currentUserId = null, CancellationToken cancellationToken = default)
    {
        var job = await _dbContext.Jobs
            .AsNoTracking()
            .FirstOrDefaultAsync(j => j.Id == jobId, cancellationToken);

        if (job == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy công việc #{jobId}.");
        }

        var reviews = await _dbContext.Reviews
            .AsNoTracking()
            .Where(r => r.JobId == jobId)
            .Include(r => r.Reviewer)
            .Include(r => r.Reviewee)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(cancellationToken);

        var list = reviews.Select(r => new ReviewDto
        {
            Id = r.Id,
            JobId = r.JobId,
            JobTitle = job.Title,
            ReviewerId = r.ReviewerId,
            ReviewerName = r.Reviewer?.FullName ?? "Người dùng",
            ReviewerAvatar = r.Reviewer?.AvatarUrl,
            RevieweeId = r.RevieweeId,
            RevieweeName = r.Reviewee?.FullName ?? "Đối tác",
            RevieweeAvatar = r.Reviewee?.AvatarUrl,
            Stars = r.Stars,
            Comment = r.Comment,
            CreatedAt = r.CreatedAt,
            IsFromEmployer = r.ReviewerId == job.EmployerId
        }).ToList();

        ReviewDto? myReview = null;
        if (currentUserId.HasValue)
        {
            myReview = list.FirstOrDefault(r => r.ReviewerId == currentUserId.Value);
        }

        return new JobReviewsSummaryDto
        {
            JobId = jobId,
            HasReviewed = myReview != null,
            MyReview = myReview,
            Reviews = list
        };
    }

    public async Task<List<ReviewDto>> GetUserReviewsAsync(int userId, CancellationToken cancellationToken = default)
    {
        var reviews = await _dbContext.Reviews
            .AsNoTracking()
            .Where(r => r.RevieweeId == userId)
            .Include(r => r.Reviewer)
            .Include(r => r.Job)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(cancellationToken);

        return reviews.Select(r => new ReviewDto
        {
            Id = r.Id,
            JobId = r.JobId,
            JobTitle = r.Job?.Title ?? "Công việc",
            ReviewerId = r.ReviewerId,
            ReviewerName = r.Reviewer?.FullName ?? "Người dùng",
            ReviewerAvatar = r.Reviewer?.AvatarUrl,
            RevieweeId = r.RevieweeId,
            RevieweeName = "",
            RevieweeAvatar = null,
            Stars = r.Stars,
            Comment = r.Comment,
            CreatedAt = r.CreatedAt,
            IsFromEmployer = r.Job != null && r.ReviewerId == r.Job.EmployerId
        }).ToList();
    }
}
