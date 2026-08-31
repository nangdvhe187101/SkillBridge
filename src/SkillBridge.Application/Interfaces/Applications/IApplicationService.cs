using System.Collections.Generic;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Applications;

namespace SkillBridge.Application.Interfaces.Applications;

public interface IApplicationService
{
    Task<JobApplicationResponseDto> ApplyJobAsync(int studentId, ApplyJobRequest request);
    Task<List<ApplicantItemDto>> GetJobApplicantsAsync(int employerId, int jobId);
    Task<List<JobApplicationResponseDto>> GetMyApplicationsAsync(int studentId);
}
