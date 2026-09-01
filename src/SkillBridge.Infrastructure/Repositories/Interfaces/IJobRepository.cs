using System.Collections.Generic;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Jobs;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Repositories.Interfaces;

public interface IJobRepository
{
    Task<Job?> GetByIdAsync(int id);
    Task<JobDetailDto?> GetJobDetailDtoAsync(int id, int? currentUserId = null);
    Task<PagedResult<JobSummaryDto>> GetPublicJobsPagedAsync(JobQueryParameters query, int? currentUserId = null);
    Task<PagedResult<JobSummaryDto>> GetEmployerJobsPagedAsync(int employerId, string? status, int page, int pageSize);
    Task<Job> CreateJobWithRequirementsAsync(Job job, List<string> requirements);
    Task UpdateJobWithRequirementsAsync(Job job, List<string> requirements);
    Task UpdateJobAsync(Job job);
    Task CancelJobAsync(Job job);
    Task ReopenJobAsync(Job job);
    Task DeleteJobAsync(Job job);
    Task<bool> SaveJobAsync(int studentId, int jobId);
    Task<bool> UnsaveJobAsync(int studentId, int jobId);
    Task<PagedResult<JobSummaryDto>> GetSavedJobsPagedAsync(int studentId, int page, int pageSize);
    Task<IReadOnlyList<int>> GetSavedJobIdsAsync(int studentId);
}
