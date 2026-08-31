using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
    public async Task<IActionResult> ApplyJob(int jobId, [FromBody] ApplyJobRequest request)
    {
        var studentId = GetRequiredUserId();
        request.JobId = jobId;
        var result = await _applicationService.ApplyJobAsync(studentId, request);
        return Ok(result);
    }

    [Authorize(Policy = "RequireEmployerRole")]
    [HttpGet("jobs/{jobId:int}/applications")]
    public async Task<IActionResult> GetJobApplicants(int jobId)
    {
        var employerId = GetRequiredUserId();
        var applicants = await _applicationService.GetJobApplicantsAsync(employerId, jobId);
        return Ok(applicants);
    }

    [Authorize(Policy = "RequireStudentRole")]
    [HttpGet("applications/my")]
    public async Task<IActionResult> GetMyApplications()
    {
        var studentId = GetRequiredUserId();
        var applications = await _applicationService.GetMyApplicationsAsync(studentId);
        return Ok(applications);
    }

    private int GetRequiredUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(idClaim) || !int.TryParse(idClaim, out var userId))
        {
            throw new UnauthorizedAccessException("Không xác định được danh tính người dùng.");
        }
        return userId;
    }
}
