using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Jobs;
using SkillBridge.Application.Interfaces.Jobs;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Repositories.Interfaces;

namespace SkillBridge.Infrastructure.Services.Jobs;

public class JobService : IJobService
{
    private readonly IJobRepository _jobRepository;
    private readonly ICategoryRepository _categoryRepository;

    public JobService(IJobRepository jobRepository, ICategoryRepository categoryRepository)
    {
        _jobRepository = jobRepository;
        _categoryRepository = categoryRepository;
    }

    public async Task<JobDetailDto> CreateJobAsync(int employerId, CreateJobRequest request)
    {
        ValidateJobInput(request.Title, request.Description, request.Budget, request.DeadlineAt, request.Location, request.Requirements);

        var category = await _categoryRepository.GetByIdAsync(request.CategoryId);
        if (category == null)
        {
            throw new BusinessException("Danh mục công việc không tồn tại.");
        }

        var revisionLimit = request.RevisionLimit.HasValue && request.RevisionLimit.Value >= 0
            ? request.RevisionLimit.Value
            : category.DefaultRevisionLimit;

        var job = new Job
        {
            EmployerId = employerId,
            CategoryId = request.CategoryId,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            Location = string.IsNullOrWhiteSpace(request.Location) ? null : request.Location.Trim(),
            Budget = request.Budget,
            IsUrgent = request.IsUrgent,
            IsFeatured = false,
            Status = "open",
            HiredApplicantId = null,
            EscrowAmount = null,
            RevisionLimit = revisionLimit,
            RevisionCount = 0,
            DeadlineAt = request.DeadlineAt
        };

        var createdJob = await _jobRepository.CreateJobWithRequirementsAsync(job, request.Requirements);
        var result = await _jobRepository.GetJobDetailDtoAsync(createdJob.Id, employerId);
        return result!;
    }

    public async Task<JobDetailDto> UpdateJobAsync(int employerId, int jobId, UpdateJobRequest request)
    {
        var job = await _jobRepository.GetByIdAsync(jobId);
        if (job == null)
        {
            throw new BusinessException("Không tìm thấy công việc.");
        }

        if (job.EmployerId != employerId)
        {
            throw new BusinessException("Bạn không có quyền chỉnh sửa công việc này.");
        }

        if (job.Status != "open")
        {
            throw new BusinessException("Chỉ có thể chỉnh sửa thông tin khi công việc đang ở trạng thái 'open'.");
        }

        ValidateJobInput(request.Title, request.Description, request.Budget, request.DeadlineAt, request.Location, request.Requirements);

        if (job.CategoryId != request.CategoryId)
        {
            var category = await _categoryRepository.GetByIdAsync(request.CategoryId);
            if (category == null)
            {
                throw new BusinessException("Danh mục công việc không tồn tại.");
            }
            job.CategoryId = request.CategoryId;
        }

        job.Title = request.Title.Trim();
        job.Description = request.Description.Trim();
        job.Location = string.IsNullOrWhiteSpace(request.Location) ? null : request.Location.Trim();
        job.Budget = request.Budget;
        job.IsUrgent = request.IsUrgent;
        job.DeadlineAt = request.DeadlineAt;

        if (request.RevisionLimit.HasValue && request.RevisionLimit.Value >= 0)
        {
            job.RevisionLimit = request.RevisionLimit.Value;
        }

        await _jobRepository.UpdateJobWithRequirementsAsync(job, request.Requirements);
        var result = await _jobRepository.GetJobDetailDtoAsync(job.Id, employerId);
        return result!;
    }

    public async Task CancelJobAsync(int employerId, int jobId)
    {
        var job = await _jobRepository.GetByIdAsync(jobId);
        if (job == null)
        {
            throw new BusinessException("Không tìm thấy công việc.");
        }

        if (job.EmployerId != employerId)
        {
            throw new BusinessException("Bạn không có quyền hủy công việc này.");
        }

        if (job.Status != "open")
        {
            throw new BusinessException("Chỉ có thể hủy công việc khi đang ở trạng thái 'open'.");
        }

        await _jobRepository.CancelJobAsync(job);
    }

    public async Task<PagedResult<JobSummaryDto>> GetEmployerJobsAsync(int employerId, string? status, int page, int pageSize)
    {
        return await _jobRepository.GetEmployerJobsPagedAsync(employerId, status, page, pageSize);
    }

    public async Task<PagedResult<JobSummaryDto>> GetPublicJobsAsync(JobQueryParameters query, int? currentUserId = null)
    {
        return await _jobRepository.GetPublicJobsPagedAsync(query, currentUserId);
    }

    public async Task<JobDetailDto> GetJobDetailAsync(int jobId, int? currentUserId = null)
    {
        var detail = await _jobRepository.GetJobDetailDtoAsync(jobId, currentUserId);
        if (detail == null)
        {
            throw new BusinessException("Không tìm thấy công việc yêu cầu.");
        }
        return detail;
    }

    public async Task SaveJobAsync(int studentId, int jobId)
    {
        var job = await _jobRepository.GetByIdAsync(jobId);
        if (job == null)
        {
            throw new BusinessException("Không tìm thấy công việc để lưu.");
        }

        await _jobRepository.SaveJobAsync(studentId, jobId);
    }

    public async Task UnsaveJobAsync(int studentId, int jobId)
    {
        await _jobRepository.UnsaveJobAsync(studentId, jobId);
    }

    public async Task<PagedResult<JobSummaryDto>> GetSavedJobsAsync(int studentId, int page, int pageSize)
    {
        return await _jobRepository.GetSavedJobsPagedAsync(studentId, page, pageSize);
    }

    public async Task<IReadOnlyList<int>> GetSavedJobIdsAsync(int studentId)
    {
        return await _jobRepository.GetSavedJobIdsAsync(studentId);
    }

    private static void ValidateJobInput(
        string title,
        string description,
        decimal budget,
        DateTime? deadlineAt,
        string? location,
        List<string>? requirements)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            throw new BusinessException("Tiêu đề công việc không được để trống.");
        }

        if (title.Trim().Length > 255)
        {
            throw new BusinessException("Tiêu đề công việc không được vượt quá 255 ký tự.");
        }

        if (string.IsNullOrWhiteSpace(description))
        {
            throw new BusinessException("Mô tả chi tiết công việc không được để trống.");
        }

        if (description.Trim().Length > 10000)
        {
            throw new BusinessException("Mô tả công việc không được vượt quá 10.000 ký tự.");
        }

        if (!string.IsNullOrWhiteSpace(location) && location.Trim().Length > 100)
        {
            throw new BusinessException("Địa điểm làm việc không được vượt quá 100 ký tự.");
        }

        if (budget <= 0 || budget % 1 != 0)
        {
            throw new BusinessException("Ngân sách phải là số nguyên dương (VNĐ).");
        }

        if (deadlineAt.HasValue && deadlineAt.Value <= DateTime.UtcNow)
        {
            throw new BusinessException("Hạn chót công việc phải lớn hơn thời điểm hiện tại.");
        }

        if (requirements != null)
        {
            if (requirements.Count > 30)
            {
                throw new BusinessException("Số lượng yêu cầu công việc không được vượt quá 30 mục.");
            }

            foreach (var req in requirements)
            {
                if (string.IsNullOrWhiteSpace(req))
                {
                    throw new BusinessException("Nội dung yêu cầu công việc không được để trống.");
                }

                if (req.Trim().Length > 500)
                {
                    throw new BusinessException("Mỗi yêu cầu công việc không được vượt quá 500 ký tự.");
                }
            }
        }
    }
}
