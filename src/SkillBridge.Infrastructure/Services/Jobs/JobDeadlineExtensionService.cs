using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Jobs;
using SkillBridge.Application.Interfaces.Jobs;
using SkillBridge.Application.Interfaces.Notifications;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Services.Jobs;

public class JobDeadlineExtensionService : IJobDeadlineExtensionService
{
    private readonly SkillBridgeDbContext _dbContext;
    private readonly INotificationService _notificationService;
    private readonly ILogger<JobDeadlineExtensionService> _logger;

    public JobDeadlineExtensionService(
        SkillBridgeDbContext dbContext,
        INotificationService _notificationService,
        ILogger<JobDeadlineExtensionService> logger)
    {
        _dbContext = dbContext;
        this._notificationService = _notificationService;
        _logger = logger;
    }

    /**
     * @ears .sdd/features/feat-job-deadline-extension/SPEC.md#REQ-EXT-001
     * @ears .sdd/features/feat-job-deadline-extension/SPEC.md#REQ-EXT-002
     * @ears .sdd/features/feat-job-deadline-extension/SPEC.md#REQ-EXT-003
     */
    public async Task<DeadlineExtensionResponse> RequestExtensionAsync(
        int studentId,
        int jobId,
        CreateDeadlineExtensionRequest request,
        CancellationToken ct = default)
    {
        var job = await _dbContext.Jobs
            .FirstOrDefaultAsync(j => j.Id == jobId, ct);

        if (job == null)
        {
            throw new BusinessException("Không tìm thấy công việc.");
        }

        if (job.HiredApplicantId != studentId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền xin gia hạn cho công việc này.");
        }

        if (job.Status != "in_progress" && job.Status != "revision_requested")
        {
            throw new BusinessException("Chỉ có thể xin gia hạn khi công việc đang trong quá trình thực hiện.");
        }

        if (job.ExtensionCount >= 2)
        {
            throw new BusinessException("Công việc này đã đạt giới hạn tối đa 02 lần gia hạn thành công.");
        }

        var hasPending = await _dbContext.JobDeadlineExtensions
            .AnyAsync(e => e.JobId == jobId && e.Status == "pending", ct);

        if (hasPending)
        {
            throw new BusinessException("Đang có một yêu cầu xin gia hạn chờ phản hồi từ Nhà tuyển dụng.");
        }

        var maxAllowedDays = CalculateMaxAllowedDays(job);
        if (request.AdditionalDays < 1 || request.AdditionalDays > maxAllowedDays)
        {
            throw new BusinessException($"Số ngày gia hạn không được vượt quá 50% thời lượng cam kết ban đầu của dự án (tối đa {maxAllowedDays} ngày).");
        }

        var currentDeadline = job.DeadlineAt ?? DateTime.UtcNow;
        var proposedDeadline = currentDeadline.AddDays(request.AdditionalDays);

        var extension = new JobDeadlineExtension
        {
            JobId = jobId,
            StudentId = studentId,
            AdditionalDays = request.AdditionalDays,
            CurrentDeadline = currentDeadline,
            ProposedDeadline = proposedDeadline,
            ReasonCategory = request.ReasonCategory.Trim(),
            DetailReason = request.DetailReason.Trim(),
            Status = "pending",
            RequestedAt = DateTime.UtcNow
        };

        _dbContext.JobDeadlineExtensions.Add(extension);
        await _dbContext.SaveChangesAsync(ct);

        // Nạp thông tin sinh viên để trả về response đầy đủ
        var student = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == studentId, ct);

        try
        {
            await _notificationService.SendAsync(
                job.EmployerId,
                "⏱️",
                $"Sinh viên {student?.FullName ?? "ứng viên"} đề xuất xin gia hạn deadline thêm {request.AdditionalDays} ngày cho công việc \"{job.Title}\".",
                $"/employer/jobs/{job.Id}",
                ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Lỗi gửi notification xin gia hạn deadline cho Job {JobId}.", jobId);
        }

        return MapToResponse(extension, job, student, maxAllowedDays);
    }

    /**
     * @ears .sdd/features/feat-job-deadline-extension/SPEC.md#REQ-EXT-001
     */
    public async Task<DeadlineExtensionResponse?> GetActiveExtensionAsync(int userId, int jobId, CancellationToken ct = default)
    {
        var job = await _dbContext.Jobs.FirstOrDefaultAsync(j => j.Id == jobId, ct);
        if (job == null) return null;

        if (job.EmployerId != userId && job.HiredApplicantId != userId)
        {
            return null;
        }

        var activeExt = await _dbContext.JobDeadlineExtensions
            .Include(e => e.Student)
            .Include(e => e.RespondedByUser)
            .Where(e => e.JobId == jobId && e.Status == "pending")
            .OrderByDescending(e => e.RequestedAt)
            .FirstOrDefaultAsync(ct);

        if (activeExt == null) return null;

        var maxAllowedDays = CalculateMaxAllowedDays(job);
        return MapToResponse(activeExt, job, activeExt.Student, maxAllowedDays);
    }

    /**
     * @ears .sdd/features/feat-job-deadline-extension/SPEC.md#REQ-EXT-001
     */
    public async Task<List<DeadlineExtensionResponse>> GetExtensionHistoryAsync(int userId, int jobId, CancellationToken ct = default)
    {
        var job = await _dbContext.Jobs.FirstOrDefaultAsync(j => j.Id == jobId, ct);
        if (job == null)
        {
            throw new BusinessException("Không tìm thấy công việc.");
        }

        if (job.EmployerId != userId && job.HiredApplicantId != userId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền xem lịch sử gia hạn của công việc này.");
        }

        var extensions = await _dbContext.JobDeadlineExtensions
            .Include(e => e.Student)
            .Include(e => e.RespondedByUser)
            .Where(e => e.JobId == jobId)
            .OrderByDescending(e => e.RequestedAt)
            .ToListAsync(ct);

        var maxAllowedDays = CalculateMaxAllowedDays(job);
        return extensions.Select(e => MapToResponse(e, job, e.Student, maxAllowedDays)).ToList();
    }

    /**
     * @ears .sdd/features/feat-job-deadline-extension/SPEC.md#REQ-EXT-004
     */
    public async Task RespondExtensionAsync(
        int employerId,
        int jobId,
        int extensionId,
        RespondDeadlineExtensionRequest request,
        CancellationToken ct = default)
    {
        var strategy = _dbContext.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await _dbContext.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
            try
            {
                if (_dbContext.Database.IsMySql())
                {
                    await _dbContext.Database.ExecuteSqlRawAsync(
                        "SELECT id FROM jobs WHERE id = {0} FOR UPDATE",
                        new object[] { jobId },
                        ct);
                }

                var job = await _dbContext.Jobs.FirstOrDefaultAsync(j => j.Id == jobId, ct);
                if (job == null)
                {
                    throw new BusinessException("Không tìm thấy công việc.");
                }

                if (job.EmployerId != employerId)
                {
                    throw new UnauthorizedAccessException("Bạn không có quyền xử lý yêu cầu gia hạn của công việc này.");
                }

                var extension = await _dbContext.JobDeadlineExtensions
                    .FirstOrDefaultAsync(e => e.Id == extensionId && e.JobId == jobId, ct);

                if (extension == null)
                {
                    throw new BusinessException("Không tìm thấy yêu cầu gia hạn.");
                }

                if (extension.Status != "pending")
                {
                    throw new BusinessException("Yêu cầu gia hạn này đã được xử lý hoặc đã bị thu hồi trước đó.");
                }

                extension.RespondedAt = DateTime.UtcNow;
                extension.RespondedByUserId = employerId;

                if (request.Action == "accept")
                {
                    if (job.ExtensionCount >= 2)
                    {
                        throw new BusinessException("Công việc này đã đạt giới hạn tối đa 02 lần gia hạn thành công.");
                    }

                    extension.Status = "accepted";
                    job.DeadlineAt = extension.ProposedDeadline;
                    job.ExtensionCount += 1;
                    job.DeadlineOverdueSentAt = null; // Reset cờ báo quá hạn vì đã có deadline mới
                    job.DeadlineWarningSentAt = null; // Reset cờ cảnh báo sắp hết hạn
                    job.UpdatedAt = DateTime.UtcNow;

                    await _dbContext.SaveChangesAsync(ct);
                    await tx.CommitAsync(ct);

                    try
                    {
                        await _notificationService.SendAsync(
                            extension.StudentId,
                            "✅",
                            $"Nhà tuyển dụng đã chấp thuận gia hạn deadline công việc \"{job.Title}\" đến {extension.ProposedDeadline:dd/MM/yyyy HH:mm}.",
                            "/student/mywork",
                            ct);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Lỗi gửi notification chấp thuận gia hạn cho Student {StudentId}.", extension.StudentId);
                    }
                }
                else // reject
                {
                    extension.Status = "rejected";
                    extension.RejectionReason = !string.IsNullOrWhiteSpace(request.RejectionReason)
                        ? request.RejectionReason.Trim()
                        : "Nhà tuyển dụng không đồng ý gia hạn thời gian hoàn thành.";
                    job.UpdatedAt = DateTime.UtcNow;

                    await _dbContext.SaveChangesAsync(ct);
                    await tx.CommitAsync(ct);

                    try
                    {
                        await _notificationService.SendAsync(
                            extension.StudentId,
                            "❌",
                            $"Đề xuất gia hạn deadline cho công việc \"{job.Title}\" đã bị từ chối. Lý do: {extension.RejectionReason}",
                            "/student/mywork",
                            ct);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Lỗi gửi notification từ chối gia hạn cho Student {StudentId}.", extension.StudentId);
                    }
                }
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        });
    }

    /**
     * @ears .sdd/features/feat-job-deadline-extension/SPEC.md#REQ-EXT-006
     */
    public async Task CancelExtensionAsync(int studentId, int jobId, int extensionId, CancellationToken ct = default)
    {
        var extension = await _dbContext.JobDeadlineExtensions
            .FirstOrDefaultAsync(e => e.Id == extensionId && e.JobId == jobId, ct);

        if (extension == null)
        {
            throw new BusinessException("Không tìm thấy yêu cầu gia hạn.");
        }

        if (extension.StudentId != studentId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền thu hồi yêu cầu gia hạn này.");
        }

        if (extension.Status != "pending")
        {
            throw new BusinessException("Chỉ có thể thu hồi yêu cầu khi đang ở trạng thái chờ phản hồi.");
        }

        extension.Status = "cancelled";
        extension.RespondedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(ct);
    }

    private static int CalculateMaxAllowedDays(Job job)
    {
        if (!job.DeadlineAt.HasValue) return 14;

        var totalDays = (job.DeadlineAt.Value - job.PostedAt).TotalDays;
        if (totalDays <= 0) totalDays = 7;

        var halfDuration = (int)Math.Floor(totalDays * 0.5);
        // Tối thiểu 1 ngày, tối đa 14 ngày
        return Math.Clamp(halfDuration, 1, 14);
    }

    private static DeadlineExtensionResponse MapToResponse(
        JobDeadlineExtension extension,
        Job job,
        User? student,
        int maxAllowedDays)
    {
        return new DeadlineExtensionResponse
        {
            Id = extension.Id,
            JobId = extension.JobId,
            JobTitle = job.Title,
            StudentId = extension.StudentId,
            StudentName = student?.FullName ?? "Sinh viên",
            StudentAvatarUrl = student?.AvatarUrl,
            AdditionalDays = extension.AdditionalDays,
            CurrentDeadline = extension.CurrentDeadline,
            ProposedDeadline = extension.ProposedDeadline,
            ReasonCategory = extension.ReasonCategory,
            DetailReason = extension.DetailReason,
            Status = extension.Status,
            RejectionReason = extension.RejectionReason,
            RequestedAt = extension.RequestedAt,
            RespondedAt = extension.RespondedAt,
            RespondedByUserId = extension.RespondedByUserId,
            RespondedByUserName = extension.RespondedByUser?.FullName,
            MaxAllowedDays = maxAllowedDays,
            RemainingExtensionAttempts = Math.Max(0, 2 - job.ExtensionCount)
        };
    }
}
