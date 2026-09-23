using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Interfaces;
using SkillBridge.Application.Interfaces.Jobs;
using SkillBridge.Application.DTOs.Jobs;
using SkillBridge.Application.Interfaces.Notifications;
using SkillBridge.Application.Interfaces.Admin;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Services.Admin;

namespace SkillBridge.Infrastructure.Services.Jobs;

public class JobDeadlineReminderJob : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<JobDeadlineReminderJob> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(15);

    public JobDeadlineReminderJob(IServiceScopeFactory scopeFactory, ILogger<JobDeadlineReminderJob> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("JobDeadlineReminderJob đã khởi động.");

        using var timer = new PeriodicTimer(_checkInterval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessDeadlineRemindersAsync(stoppingToken);
                await ProcessAutoAcceptDeliverablesAsync(stoppingToken);
                await timer.WaitForNextTickAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi xảy ra trong quá trình quét nhắc hạn công việc định kỳ.");
                try
                {
                    await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }
        }

        _logger.LogInformation("JobDeadlineReminderJob đang dừng lại.");
    }

    public async Task ProcessDeadlineRemindersAsync(CancellationToken ct = default)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SkillBridgeDbContext>();
        var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();
        var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

        var now = DateTime.UtcNow;
        var threshold = now.AddHours(12);
        var allowedStatuses = new[] { "in_progress", "revision_requested" };

        var candidateJobs = await db.Jobs
            .Include(j => j.Employer)
            .Include(j => j.HiredApplicant)
            .Where(j => allowedStatuses.Contains(j.Status)
                && j.DeadlineAt.HasValue
                && j.DeadlineAt.Value <= threshold
                && (j.DeadlineWarningSentAt == null || j.DeadlineOverdueSentAt == null))
            .ToListAsync(ct);

        foreach (var job in candidateJobs)
        {
            if (ct.IsCancellationRequested) break;

            var deadline = job.DeadlineAt!.Value;

            // 1. Kiểm tra mốc quá hạn (Overdue)
            if (now >= deadline && job.DeadlineOverdueSentAt == null)
            {
                // Gửi thông báo & email cho sinh viên
                if (job.HiredApplicant != null)
                {
                    try
                    {
                        await notificationService.SendAsync(
                            job.HiredApplicant.Id,
                            "⚠️",
                            $"Công việc \"{job.Title}\" đã quá hạn hoàn thành ({deadline.ToLocalTime():HH:mm dd/MM/yyyy}). Vui lòng kiểm tra và liên hệ nhà tuyển dụng.",
                            "/mywork",
                            ct);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Không thể gửi thông báo quá hạn cho sinh viên {StudentId} Job #{JobId}.", job.HiredApplicant.Id, job.Id);
                    }

                    if (!string.IsNullOrWhiteSpace(job.HiredApplicant.Email))
                    {
                        try
                        {
                            await emailService.SendDeadlineOverdueEmailAsync(
                                job.HiredApplicant.Email,
                                job.HiredApplicant.FullName,
                                job.Title,
                                deadline);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "Không thể gửi email quá hạn cho sinh viên {Email} Job #{JobId}.", job.HiredApplicant.Email, job.Id);
                        }
                    }
                }

                // Gửi thông báo & email cho nhà tuyển dụng
                if (job.Employer != null)
                {
                    try
                    {
                        await notificationService.SendAsync(
                            job.Employer.Id,
                            "⚠️",
                            $"Công việc \"{job.Title}\" đã quá hạn bàn giao ({deadline.ToLocalTime():HH:mm dd/MM/yyyy}). Vui lòng liên hệ sinh viên hoặc gửi khiếu nại nếu cần.",
                            $"/jobs/{job.Id}",
                            ct);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Không thể gửi thông báo quá hạn cho nhà tuyển dụng {EmployerId} Job #{JobId}.", job.Employer.Id, job.Id);
                    }

                    if (!string.IsNullOrWhiteSpace(job.Employer.Email))
                    {
                        try
                        {
                            await emailService.SendDeadlineOverdueEmailAsync(
                                job.Employer.Email,
                                job.Employer.FullName,
                                job.Title,
                                deadline);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "Không thể gửi email quá hạn cho nhà tuyển dụng {Email} Job #{JobId}.", job.Employer.Email, job.Id);
                        }
                    }
                }

                job.DeadlineOverdueSentAt = now;
                if (job.DeadlineWarningSentAt == null)
                {
                    job.DeadlineWarningSentAt = now;
                }
                try
                {
                    await db.SaveChangesAsync(ct);
                    _logger.LogInformation("Đã gửi nhắc nhở quá hạn (overdue) cho Job #{JobId}.", job.Id);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Lỗi lưu trạng thái deadline_overdue_sent_at cho Job #{JobId}.", job.Id);
                }
            }
            // 2. Kiểm tra mốc sắp hết hạn (Warning < 12h)
            else if (deadline > now && (deadline - now) < TimeSpan.FromHours(12) && job.DeadlineWarningSentAt == null)
            {
                if (job.HiredApplicant != null)
                {
                    try
                    {
                        await notificationService.SendAsync(
                            job.HiredApplicant.Id,
                            "⏰",
                            $"Công việc \"{job.Title}\" sắp tới hạn bàn giao (trước {deadline.ToLocalTime():HH:mm dd/MM/yyyy}). Vui lòng hoàn thành và nộp bàn giao sớm.",
                            "/mywork",
                            ct);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Không thể gửi thông báo sắp hết hạn cho sinh viên {StudentId} Job #{JobId}.", job.HiredApplicant.Id, job.Id);
                    }

                    if (!string.IsNullOrWhiteSpace(job.HiredApplicant.Email))
                    {
                        try
                        {
                            await emailService.SendDeadlineWarningEmailAsync(
                                job.HiredApplicant.Email,
                                job.HiredApplicant.FullName,
                                job.Title,
                                deadline);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "Không thể gửi email sắp hết hạn cho sinh viên {Email} Job #{JobId}.", job.HiredApplicant.Email, job.Id);
                        }
                    }
                }

                job.DeadlineWarningSentAt = now;
                try
                {
                    await db.SaveChangesAsync(ct);
                    _logger.LogInformation("Đã gửi nhắc nhở sắp hết hạn (warning) cho Job #{JobId}.", job.Id);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Lỗi lưu trạng thái deadline_warning_sent_at cho Job #{JobId}.", job.Id);
                }
            }
        }
    }

    public async Task ProcessAutoAcceptDeliverablesAsync(CancellationToken ct = default)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SkillBridgeDbContext>();
        var settingService = scope.ServiceProvider.GetService<ISystemSettingService>();
        var deliverableService = scope.ServiceProvider.GetRequiredService<IDeliverableService>();

        var autoAcceptHours = 72;
        if (settingService != null)
        {
            try
            {
                autoAcceptHours = await settingService.GetIntSettingAsync(SystemSettingService.KeyAutoAcceptHours, 72, ct);
            }
            catch
            {
                autoAcceptHours = 72;
            }
        }

        var now = DateTime.UtcNow;
        var threshold = now.AddHours(-autoAcceptHours);

        var expiredDeliverables = await db.JobDeliverables
            .Include(d => d.Job)
            .Where(d => d.Status == "pending"
                && d.SubmittedAt <= threshold
                && d.Job.Status == "submitted")
            .ToListAsync(ct);

        foreach (var del in expiredDeliverables)
        {
            if (ct.IsCancellationRequested) break;

            try
            {
                await deliverableService.ReviewDeliverableAsync(
                    del.Job.EmployerId,
                    del.JobId,
                    del.Id,
                    new ReviewDeliverableRequest
                    {
                        Status = "accepted",
                        FeedbackComment = $"Hệ thống SkillBridge tự động nghiệm thu và giải ngân Escrow sau {autoAcceptHours} giờ theo cam kết bảo vệ quyền lợi sinh viên."
                    },
                    ct);

                _logger.LogInformation("Đã tự động nghiệm thu và giải ngân Deliverable #{DeliverableId} của Job #{JobId} sau {Hours}h.",
                    del.Id, del.JobId, autoAcceptHours);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi tự động nghiệm thu Deliverable #{DeliverableId} của Job #{JobId}.", del.Id, del.JobId);
            }
        }
    }
}
