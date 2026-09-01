using System.Collections.Generic;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Jobs;

namespace SkillBridge.Application.Interfaces.Jobs;

public interface IJobService
{
    Task<JobDetailDto> CreateJobAsync(int employerId, CreateJobRequest request);
    Task<JobDetailDto> UpdateJobAsync(int employerId, int jobId, UpdateJobRequest request);
    Task CancelJobAsync(int employerId, int jobId);
    Task ReopenJobAsync(int employerId, int jobId);
    Task DeleteJobAsync(int employerId, int jobId);
    Task<PagedResult<JobSummaryDto>> GetEmployerJobsAsync(int employerId, string? status, int page, int pageSize);
    Task<PagedResult<JobSummaryDto>> GetPublicJobsAsync(JobQueryParameters query, int? currentUserId = null);
    Task<JobDetailDto> GetJobDetailAsync(int jobId, int? currentUserId = null);
    Task SaveJobAsync(int studentId, int jobId);
    Task UnsaveJobAsync(int studentId, int jobId);
    Task<PagedResult<JobSummaryDto>> GetSavedJobsAsync(int studentId, int page, int pageSize);
    Task<IReadOnlyList<int>> GetSavedJobIdsAsync(int studentId);
}
