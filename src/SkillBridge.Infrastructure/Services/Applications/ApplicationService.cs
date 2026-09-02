using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Applications;
using SkillBridge.Application.DTOs.Jobs;
using SkillBridge.Application.Interfaces.Applications;
using SkillBridge.Application.Interfaces.Storage;
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

    public ApplicationService(
        IApplicationRepository applicationRepository,
        IJobRepository jobRepository,
        ICvFileRepository cvFileRepository,
        SkillBridgeDbContext dbContext,
        IStorageService storageService)
    {
        _applicationRepository = applicationRepository;
        _jobRepository = jobRepository;
        _cvFileRepository = cvFileRepository;
        _dbContext = dbContext;
        _storageService = storageService;
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

        var alreadyApplied = await _applicationRepository.ExistsAsync(request.JobId, studentId);
        if (alreadyApplied)
        {
            throw new BusinessException("Bạn đã gửi đơn ứng tuyển cho công việc này rồi.");
        }

        var cv = await _cvFileRepository.GetByIdAsync(request.CvFileId);
        if (cv == null || cv.StudentId != studentId)
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
            CvFileId = cv.Id,
            CvFileName = cv.FileName,
            CvFileUrl = _storageService.GetPublicUrl(cv.FileUrl),
            CoverLetter = application.CoverLetter,
            Status = application.Status,
            AppliedAt = application.AppliedAt
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
            CvFileUrl = _storageService.GetPublicUrl(a.CvFile?.FileUrl),
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
            Budget = a.Job?.Budget ?? 0,
            StudentId = a.StudentId,
            CvFileId = a.CvFileId,
            CvFileName = a.CvFile?.FileName,
            CvFileUrl = _storageService.GetPublicUrl(a.CvFile?.FileUrl),
            CoverLetter = a.CoverLetter,
            Status = a.Status,
            AppliedAt = a.AppliedAt
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

        if (application.Status == "rejected")
        {
            throw new BusinessException("Hồ sơ ứng tuyển này đã bị từ chối trước đó.");
        }

        var executionStrategy = _dbContext.Database.CreateExecutionStrategy();
        return await executionStrategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                var durationDays = request?.Days.HasValue == true && request.Days.Value > 0 ? request.Days.Value : 3;

                // Cập nhật trạng thái công việc
                job.HiredApplicantId = application.StudentId;
                job.Status = "in_progress";
                job.DeadlineAt = DateTime.UtcNow.AddDays(durationDays);
                job.UpdatedAt = DateTime.UtcNow;
                await _jobRepository.UpdateJobAsync(job);

                // Cập nhật trạng thái ứng viên được chọn
                application.Status = "hired";
                application.UpdatedAt = DateTime.UtcNow;
                await _applicationRepository.UpdateAsync(application);

                // Đánh dấu từ chối các ứng viên khác cho công việc này
                var otherApplications = await _applicationRepository.GetByJobIdAsync(jobId);
                foreach (var other in otherApplications)
                {
                    if (other.Id != applicationId && other.Status == "pending")
                    {
                        other.Status = "rejected";
                        other.UpdatedAt = DateTime.UtcNow;
                        await _applicationRepository.UpdateAsync(other);
                    }
                }

                await transaction.CommitAsync();

                return new HireApplicantResultDto
                {
                    JobId = job.Id,
                    ApplicationId = application.Id,
                    HiredStudentId = application.StudentId,
                    HiredStudentName = application.Student?.FullName ?? "Sinh viên",
                    JobStatus = job.Status,
                    DeadlineAt = job.DeadlineAt,
                    EscrowAmount = job.Budget
                };
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        });
    }
}
