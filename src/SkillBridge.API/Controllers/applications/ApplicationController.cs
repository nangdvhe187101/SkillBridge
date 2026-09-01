using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.API.Common;
using SkillBridge.Application.DTOs.Applications;
using SkillBridge.Application.Interfaces.Applications;

namespace SkillBridge.API.Controllers.applications;

[ApiController]
[Route("api")]
public class ApplicationController : ControllerBase
{
    private readonly IApplicationService _applicationService;

    public ApplicationController(IApplicationService applicationService)
    {
        _applicationService = applicationService;
    }

    [Authorize(Policy = "RequireStudentRole")]
    [HttpPost("jobs/{jobId:int}/apply")]
    [EnableRateLimiting("ResourceCreationPolicy")]
    public async Task<IActionResult> ApplyJob(int jobId, [FromBody] ApplyJobRequest request)
    {
        var studentId = User.GetRequiredUserId();
        request.JobId = jobId;
        var result = await _applicationService.ApplyJobAsync(studentId, request);
        return Ok(result);
    }

    [Authorize(Policy = "RequireEmployerRole")]
    [HttpGet("jobs/{jobId:int}/applications")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetJobApplicants(int jobId)
    {
        var employerId = User.GetRequiredUserId();
        var applicants = await _applicationService.GetJobApplicantsAsync(employerId, jobId);
        return Ok(applicants);
    }

    [Authorize(Policy = "RequireStudentRole")]
    [HttpGet("applications/my")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetMyApplications()
    {
        var studentId = User.GetRequiredUserId();
        var applications = await _applicationService.GetMyApplicationsAsync(studentId);
        return Ok(applications);
    }
}
