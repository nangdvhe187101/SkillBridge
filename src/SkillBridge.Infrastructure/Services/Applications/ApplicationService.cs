using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Applications;
using SkillBridge.Application.DTOs.Jobs;
using SkillBridge.Application.Interfaces.Applications;
using SkillBridge.Application.Interfaces.Storage;
using SkillBridge.Application.Interfaces.Payments;
using SkillBridge.Application.Interfaces.Users;
using SkillBridge.Application.Interfaces.Notifications;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Repositories.Interfaces;

namespace SkillBridge.Infrastructure.Services.Applications;

public class ApplicationService : IApplicationService
{
    private readonly IApplicationRepository _applicationRepository;
    private readonly IJobRepository _jobRepository;
    private readonly ICvFileRepository _cvFileRepository;
    private readonly SkillBridgeDbContext _dbContext;
    private readonly IStorageService _storageService;
    private readonly IEscrowPaymentService _escrowPaymentService;
    private readonly IUserReliabilityService _reliabilityService;
    private readonly INotificationService _notificationService;
    private readonly ILogger<ApplicationService> _logger;

    public ApplicationService(
        IApplicationRepository applicationRepository,
        IJobRepository jobRepository,
        ICvFileRepository cvFileRepository,
        SkillBridgeDbContext dbContext,
        IStorageService storageService,
        IEscrowPaymentService escrowPaymentService,
        IUserReliabilityService reliabilityService,
        INotificationService notificationService,
        ILogger<ApplicationService> logger)
    {
        _applicationRepository = applicationRepository;
        _jobRepository = jobRepository;
        _cvFileRepository = cvFileRepository;
        _dbContext = dbContext;
        _storageService = storageService;
        _escrowPaymentService = escrowPaymentService;
        _reliabilityService = reliabilityService;
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task<JobApplicationResponseDto> ApplyJobAsync(int studentId, ApplyJobRequest request)
    {
        var job = await _jobRepository.GetByIdAsync(request.JobId);
        if (job == null)
        {
            throw new BusinessException("Công việc không tồn tại.");
        }

        if (job.Status != "open")
        {
            throw new BusinessException("Công việc này hiện không còn nhận hồ sơ ứng tuyển.");
        }

        if (job.EmployerId == studentId)
        {
            throw new BusinessException("Bạn không thể ứng tuyển vào công việc do chính mình đăng.");
        }

        var existingApp = await _applicationRepository.GetByJobAndStudentAsync(request.JobId, studentId);
        if (existingApp != null)
        {
            if (existingApp.Status != "cancelled" && existingApp.Status != "rejected")
            {
                throw new BusinessException("Bạn đã gửi đơn ứng tuyển cho công việc này rồi.");
            }

            // Nếu đơn cũ đã bị 'cancelled' hoặc 'rejected', cho phép ứng tuyển lại bằng cách cập nhật bản ghi cũ
            // (Đảm bảo tuân thủ unique constraint (job_id, student_id) trong cơ sở dữ liệu)
            var cv = await _cvFileRepository.GetByIdAsync(request.CvFileId);
            if (cv == null || cv.StudentId != studentId)
            {
                throw new BusinessException("Bản CV được chọn không hợp lệ hoặc không thuộc tài khoản của bạn.");
            }

            existingApp.CvFileId = request.CvFileId;
            existingApp.CoverLetter = string.IsNullOrWhiteSpace(request.CoverLetter) ? null : request.CoverLetter.Trim();
            existingApp.Status = "pending";
            existingApp.AppliedAt = DateTime.UtcNow;
            existingApp.UpdatedAt = DateTime.UtcNow;

            await _applicationRepository.UpdateAsync(existingApp);

            return new JobApplicationResponseDto
            {
                Id = existingApp.Id,
                JobId = job.Id,
                JobTitle = job.Title,
                EmployerName = job.Employer?.FullName ?? "Nhà tuyển dụng",
                Budget = job.Budget,
                StudentId = studentId,
                CvFileId = cv.Id,
                CvFileName = cv.FileName,
                CvFileUrl = $"/api/cv-files/{cv.Id}/download",
                CoverLetter = existingApp.CoverLetter,
                Status = existingApp.Status,
                AppliedAt = existingApp.AppliedAt,
                JobStatus = job.Status,
                DeadlineAt = job.DeadlineAt,
                RevisionLimit = job.RevisionLimit,
                RevisionCount = job.RevisionCount
            };
        }

        var newCv = await _cvFileRepository.GetByIdAsync(request.CvFileId);
        if (newCv == null || newCv.StudentId != studentId)
        {
            throw new BusinessException("Bản CV được chọn không hợp lệ hoặc không thuộc tài khoản của bạn.");
        }

        var application = new JobApplication
        {
            JobId = request.JobId,
            StudentId = studentId,
            CvFileId = request.CvFileId,
            CoverLetter = string.IsNullOrWhiteSpace(request.CoverLetter) ? null : request.CoverLetter.Trim(),
            Status = "pending",
            AppliedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _applicationRepository.AddAsync(application);

        return new JobApplicationResponseDto
        {
            Id = application.Id,
            JobId = job.Id,
            JobTitle = job.Title,
            EmployerName = job.Employer?.FullName ?? "Nhà tuyển dụng",
            Budget = job.Budget,
            StudentId = studentId,
            CvFileId = newCv.Id,
            CvFileName = newCv.FileName,
            CvFileUrl = $"/api/cv-files/{newCv.Id}/download",
            CoverLetter = application.CoverLetter,
            Status = application.Status,
            AppliedAt = application.AppliedAt,
            JobStatus = job.Status,
            DeadlineAt = job.DeadlineAt,
            RevisionLimit = job.RevisionLimit,
            RevisionCount = job.RevisionCount
        };
    }

    public async Task<PagedResult<ApplicantItemDto>> GetJobApplicantsAsync(int employerId, int jobId, int page = 1, int pageSize = 20)
    {
        var job = await _jobRepository.GetByIdAsync(jobId);
        if (job == null)
        {
            throw new BusinessException("Công việc không tồn tại.");
        }

        if (job.EmployerId != employerId)
        {
            throw new BusinessException("Bạn không có quyền xem danh sách ứng viên của công việc này.");
        }

        var (applications, totalCount) = await _applicationRepository.GetByJobIdPagedAsync(jobId, page, pageSize);
        var items = applications.Select(a => new ApplicantItemDto
        {
            ApplicationId = a.Id,
            StudentId = a.StudentId,
            StudentName = a.Student?.FullName ?? "Sinh viên",
            StudentEmail = a.Student?.Email,
            StudentPhone = a.Student?.PhoneNumber,
            StudentAvatarUrl = _storageService.GetPublicUrl(a.Student?.AvatarUrl),
            School = a.Student?.School,
            ReliabilityScore = a.Student?.ReliabilityScore ?? 95,
            JobsDoneCount = a.Student?.JobsDoneCount ?? 0,
            KycStatus = a.Student?.KycStatus ?? "verified",
            CvFileId = a.CvFileId,
            CvFileName = a.CvFile?.FileName,
            CvFileUrl = a.CvFileId.HasValue ? $"/api/cv-files/{a.CvFileId.Value}/download" : null,
            CvLabel = a.CvFile?.Label,
            CoverLetter = a.CoverLetter,
            Status = a.Status,
            AppliedAt = a.AppliedAt
        }).ToList();

        return new SkillBridge.Application.DTOs.Jobs.PagedResult<ApplicantItemDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page <= 0 ? 1 : page,
            PageSize = pageSize <= 0 ? PaginationConstants.DefaultLargePageSize : Math.Min(pageSize, PaginationConstants.MaxPageSize)
        };
    }

    public async Task<PagedResult<JobApplicationResponseDto>> GetMyApplicationsAsync(int studentId, int page = 1, int pageSize = 20)
    {
        var (applications, totalCount) = await _applicationRepository.GetByStudentIdPagedAsync(studentId, page, pageSize);
        var items = applications.Select(a => new JobApplicationResponseDto
        {
            Id = a.Id,
            JobId = a.JobId,
            JobTitle = a.Job?.Title ?? "Công việc",
            EmployerName = a.Job?.Employer?.FullName ?? "Nhà tuyển dụng",
            EmployerAvatarUrl = _storageService.GetPublicUrl(a.Job?.Employer?.AvatarUrl),
            Budget = a.Job?.Budget ?? 0,
            StudentId = a.StudentId,
            CvFileId = a.CvFileId,
            CvFileName = a.CvFile?.FileName,
            CvFileUrl = a.CvFileId.HasValue ? $"/api/cv-files/{a.CvFileId.Value}/download" : null,
            CoverLetter = a.CoverLetter,
            Status = a.Status,
            AppliedAt = a.AppliedAt,
            JobStatus = a.Job?.Status,
            DeadlineAt = a.Job?.DeadlineAt,
            RevisionLimit = a.Job?.RevisionLimit ?? 2,
            RevisionCount = a.Job?.RevisionCount ?? 0
        }).ToList();

        return new SkillBridge.Application.DTOs.Jobs.PagedResult<JobApplicationResponseDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page <= 0 ? 1 : page,
            PageSize = pageSize <= 0 ? PaginationConstants.DefaultLargePageSize : Math.Min(pageSize, PaginationConstants.MaxPageSize)
        };
    }

    public async Task<HireApplicantResultDto> HireApplicantAsync(int employerId, int jobId, int applicationId, HireApplicantRequest? request = null)
    {
        var job = await _jobRepository.GetByIdAsync(jobId);
        if (job == null)
        {
            throw new BusinessException("Công việc không tồn tại.");
        }

        if (job.EmployerId != employerId)
        {
            throw new BusinessException("Bạn không có quyền thực hiện hành động này trên công việc đã chọn.");
        }

        if (job.Status != "open")
        {
            throw new BusinessException("Công việc này không ở trạng thái đang mở nhận ứng viên.");
        }

        var application = await _applicationRepository.GetByIdAsync(applicationId);
        if (application == null || application.JobId != jobId)
        {
            throw new BusinessException("Hồ sơ ứng tuyển không tồn tại hoặc không thuộc công việc này.");
        }

        if (application.Status == "cancelled")
        {
            throw new BusinessException("Ứng viên này đã rút đơn ứng tuyển, không thể thuê.");
        }

        if (application.Status == "hired" || application.Status == "completed")
        {
            throw new BusinessException("Hồ sơ ứng tuyển này đã được xử lý trước đó.");
        }

        var executionStrategy = _dbContext.Database.CreateExecutionStrategy();
        return await executionStrategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                // Re-check trạng thái công việc bên trong transaction để chống race condition khi có nhiều request đồng thời
                var currentJob = await _dbContext.Jobs.FirstOrDefaultAsync(j => j.Id == jobId);
                if (currentJob == null || currentJob.Status != "open")
                {
                    throw new BusinessException("Công việc này không còn ở trạng thái mở nhận ứng viên.");
                }

                var currentApp = await _dbContext.Applications
                    .Include(a => a.Student)
                    .FirstOrDefaultAsync(a => a.Id == applicationId && a.JobId == jobId);
                if (currentApp == null || currentApp.Status == "cancelled" || currentApp.Status == "hired" || currentApp.Status == "completed")
                {
                    throw new BusinessException("Hồ sơ ứng tuyển này không còn hợp lệ hoặc đã được xử lý trước đó.");
                }

                var durationDays = request?.Days.HasValue == true && request.Days.Value > 0 ? request.Days.Value : 3;

                // Cập nhật trạng thái công việc
                currentJob.HiredApplicantId = currentApp.StudentId;
                currentJob.EscrowAmount = currentJob.Budget;
                currentJob.Status = "in_progress";
                currentJob.DeadlineAt = DateTime.UtcNow.AddDays(durationDays);
                currentJob.UpdatedAt = DateTime.UtcNow;

                // Cập nhật trạng thái ứng viên được chọn
                currentApp.Status = "hired";
                currentApp.UpdatedAt = DateTime.UtcNow;

                // Đánh dấu từ chối các ứng viên khác đang pending cho công việc này
                var otherApplications = await _dbContext.Applications
                    .Where(a => a.JobId == jobId && a.Id != applicationId && a.Status == "pending")
                    .ToListAsync();
                foreach (var other in otherApplications)
                {
                    other.Status = "rejected";
                    other.UpdatedAt = DateTime.UtcNow;
                }

                // Ghi nhận ký quỹ Escrow vào sổ cái giao dịch
                if (currentJob.Budget > 0)
                {
                    await _escrowPaymentService.HoldEscrowAsync(
                        employerId,
                        currentJob.Id,
                        currentJob.Title,
                        currentJob.Budget);
                }

                // Gửi thông báo trúng tuyển cho sinh viên
                await _notificationService.SendAsync(
                    currentApp.StudentId,
                    "🎉",
                    $"Chúc mừng! Bạn đã được chọn thực hiện công việc \"{currentJob.Title}\".",
                    "/mywork");

                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();

                return new HireApplicantResultDto
                {
                    JobId = currentJob.Id,
                    ApplicationId = currentApp.Id,
                    HiredStudentId = currentApp.StudentId,
                    HiredStudentName = currentApp.Student?.FullName ?? "Sinh viên",
                    JobStatus = currentJob.Status,
                    DeadlineAt = currentJob.DeadlineAt,
                    EscrowAmount = currentJob.Budget
                };
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        });
    }

    public async Task CancelOrWithdrawApplicationAsync(int studentId, int jobId, string? reason = null)
    {
        var strategy = _dbContext.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                var application = await _dbContext.Applications
                    .Include(a => a.Job)
                    .Include(a => a.Student)
                    .FirstOrDefaultAsync(a => a.StudentId == studentId && a.JobId == jobId);

                if (application == null)
                {
                    throw new BusinessException("Không tìm thấy đơn ứng tuyển cho công việc này.");
                }

                if (application.Status == "cancelled")
                {
                    throw new BusinessException("Đơn ứng tuyển này đã được hủy trước đó.");
                }

                if (application.Status == "completed")
                {
                    throw new BusinessException("Công việc đã hoàn thành, không thể hủy.");
                }

                if (application.Status == "rejected")
                {
                    throw new BusinessException("Hồ sơ ứng tuyển này đã bị từ chối, không thể rút đơn.");
                }

                var isHiredForThisJob = application.Status == "hired" ||
                    (application.Job != null && application.Job.HiredApplicantId == studentId);

                var isJobInProgress = application.Job != null &&
                    new[] { "in_progress", "submitted", "revision_requested" }.Contains(application.Job.Status);

                var isHiredOrInProgress = isHiredForThisJob && isJobInProgress;

                // Nếu đang trong quá trình thực hiện việc (đã được thuê), trừ 10 điểm uy tín sinh viên
                if (isHiredOrInProgress)
                {
                    await _reliabilityService.PenalizeScoreAsync(
                        studentId,
                        10,
                        $"Sinh viên hủy việc đang làm tại Job #{jobId}. Lý do: {reason ?? "Không có lý do"}");

                    // Reset Job về trạng thái open để NTD có thể chọn người khác
                    var job = application.Job ?? await _jobRepository.GetByIdAsync(jobId);
                    if (job != null)
                    {
                        job.Status = "open";
                        job.HiredApplicantId = null;
                        job.DeadlineAt = null;
                        job.EscrowAmount = null;
                        job.RevisionCount = 0; // Reset số lần chỉnh sửa cho lượt thuê mới
                        job.UpdatedAt = DateTime.UtcNow;
                        _dbContext.Jobs.Update(job);

                        // Hoàn tiền ký quỹ lại cho Nhà tuyển dụng vì sinh viên đơn phương hủy việc
                        if (job.Budget > 0)
                        {
                            await _escrowPaymentService.RefundEscrowAsync(
                                job.EmployerId,
                                job.Id,
                                job.Title,
                                job.Budget,
                                $"Hoàn tiền ký quỹ do sinh viên hủy nhận việc Job #{job.Id} · {job.Title}");
                        }

                        // Gửi thông báo cho Nhà tuyển dụng
                        await _notificationService.SendAsync(
                            job.EmployerId,
                            "⚠️",
                            $"Sinh viên đã hủy thực hiện công việc \"{job.Title}\". Số tiền ký quỹ {job.Budget:N0}đ đã được hoàn lại vào ví của bạn.",
                            $"/jobs/{job.Id}/applicants");

                        // Khôi phục lại các đơn ứng tuyển của các sinh viên khác (từng bị auto-rejected khi thuê) về lại pending để NTD có thể chọn tiếp
                        var autoRejectedApps = await _dbContext.Applications
                            .Where(a => a.JobId == jobId && a.Id != application.Id && a.Status == "rejected")
                            .ToListAsync();
                        foreach (var other in autoRejectedApps)
                        {
                            other.Status = "pending";
                            other.UpdatedAt = DateTime.UtcNow;
                        }
                    }

                    // Đánh dấu hủy các bản bàn giao chưa được nghiệm thu của sinh viên này và dọn dẹp file R2
                    var pendingDeliverables = await _dbContext.JobDeliverables
                        .Where(d => d.JobId == jobId && d.StudentId == studentId && d.Status != "accepted")
                        .ToListAsync();
                    foreach (var del in pendingDeliverables)
                    {
                        del.Status = "cancelled";
                        if (!string.Equals(del.FileType, "url", StringComparison.OrdinalIgnoreCase))
                        {
                            foreach (var url in new[] { del.PreviewFileUrl, del.FinalFileUrl })
                            {
                                var key = StorageKeyHelper.ExtractKey(url);
                                if (!string.IsNullOrWhiteSpace(key))
                                {
                                    try
                                    {
                                        await _storageService.DeleteFileAsync(key);
                                        _logger.LogInformation("Đã dọn dẹp file R2 {FileKey} của deliverable khi sinh viên hủy việc (Job #{JobId}).", key, jobId);
                                    }
                                    catch (Exception ex)
                                    {
                                        _logger.LogWarning(ex, "Không thể xóa file {FileKey} trên R2 khi sinh viên hủy việc Job #{JobId}.", key, jobId);
                                    }
                                }
                            }
                        }
                        del.PreviewFileUrl = null;
                        del.FinalFileUrl = null;
                    }
                }

                // Cập nhật Application của sinh viên sang cancelled
                application.Status = "cancelled";
                application.UpdatedAt = DateTime.UtcNow;
                _dbContext.Applications.Update(application);

                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("Đã xử lý hủy đơn/việc cho sinh viên {StudentId} tại Job {JobId}. Đang làm: {IsHiredOrInProgress}",
                    studentId, jobId, isHiredOrInProgress);
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        });
    }
}
