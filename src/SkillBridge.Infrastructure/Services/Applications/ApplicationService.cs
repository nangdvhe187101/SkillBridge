using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Applications;
using SkillBridge.Application.Interfaces.Applications;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Repositories.Interfaces;

namespace SkillBridge.Infrastructure.Services.Applications;

public class ApplicationService : IApplicationService
{
    private readonly IApplicationRepository _applicationRepository;
    private readonly IJobRepository _jobRepository;
    private readonly ICvFileRepository _cvFileRepository;

    public ApplicationService(
        IApplicationRepository applicationRepository,
        IJobRepository jobRepository,
        ICvFileRepository cvFileRepository)
    {
        _applicationRepository = applicationRepository;
        _jobRepository = jobRepository;
        _cvFileRepository = cvFileRepository;
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
            CvFileUrl = cv.FileUrl,
            Status = application.Status,
            AppliedAt = application.AppliedAt
        };
    }

    public async Task<List<ApplicantItemDto>> GetJobApplicantsAsync(int employerId, int jobId)
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

        var applications = await _applicationRepository.GetByJobIdAsync(jobId);
        return applications.Select(a => new ApplicantItemDto
        {
            ApplicationId = a.Id,
            StudentId = a.StudentId,
            StudentName = a.Student?.FullName ?? "Sinh viên",
            StudentAvatarUrl = a.Student?.AvatarUrl,
            School = a.Student?.School,
            CvFileId = a.CvFileId,
            CvFileName = a.CvFile?.FileName,
            CvFileUrl = a.CvFile?.FileUrl,
            CvLabel = a.CvFile?.Label,
            Status = a.Status,
            AppliedAt = a.AppliedAt
        }).ToList();
    }

    public async Task<List<JobApplicationResponseDto>> GetMyApplicationsAsync(int studentId)
    {
        var applications = await _applicationRepository.GetByStudentIdAsync(studentId);
        return applications.Select(a => new JobApplicationResponseDto
        {
            Id = a.Id,
            JobId = a.JobId,
            JobTitle = a.Job?.Title ?? "Công việc",
            EmployerName = a.Job?.Employer?.FullName ?? "Nhà tuyển dụng",
            Budget = a.Job?.Budget ?? 0,
            StudentId = a.StudentId,
            CvFileId = a.CvFileId,
            CvFileName = a.CvFile?.FileName,
            CvFileUrl = a.CvFile?.FileUrl,
            Status = a.Status,
            AppliedAt = a.AppliedAt
        }).ToList();
    }
}
