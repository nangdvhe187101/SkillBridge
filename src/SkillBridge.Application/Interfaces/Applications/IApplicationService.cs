using System.Collections.Generic;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Applications;
using SkillBridge.Application.DTOs.Jobs;

namespace SkillBridge.Application.Interfaces.Applications;

public interface IApplicationService
{
    Task<JobApplicationResponseDto> ApplyJobAsync(int studentId, ApplyJobRequest request);
    Task<PagedResult<ApplicantItemDto>> GetJobApplicantsAsync(int employerId, int jobId, int page = 1, int pageSize = 20);
    Task<PagedResult<JobApplicationResponseDto>> GetMyApplicationsAsync(int studentId, int page = 1, int pageSize = 20);
    Task<HireApplicantResultDto> HireApplicantAsync(int employerId, int jobId, int applicationId, HireApplicantRequest? request = null);
}
