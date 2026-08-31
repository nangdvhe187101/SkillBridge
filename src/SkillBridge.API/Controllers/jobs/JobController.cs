using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkillBridge.Application.DTOs.Jobs;
using SkillBridge.Application.Interfaces.Jobs;

namespace SkillBridge.API.Controllers.jobs;

[ApiController]
[Route("api/jobs")]
public class JobController : ControllerBase
{
    private readonly IJobService _jobService;

    public JobController(IJobService jobService)
    {
        _jobService = jobService;
    }

    [HttpGet]
    public async Task<IActionResult> GetPublicJobs([FromQuery] JobQueryParameters parameters)
    {
        var currentUserId = GetCurrentUserId();
        var result = await _jobService.GetPublicJobsAsync(parameters, currentUserId);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetJobDetail(int id)
    {
        var currentUserId = GetCurrentUserId();
        var detail = await _jobService.GetJobDetailAsync(id, currentUserId);
        return Ok(detail);
    }

    [Authorize(Policy = "RequireEmployerRole")]
    [HttpPost]
    public async Task<IActionResult> CreateJob([FromBody] CreateJobRequest request)
    {
        var employerId = GetRequiredUserId();
        var job = await _jobService.CreateJobAsync(employerId, request);
        return CreatedAtAction(nameof(GetJobDetail), new { id = job.Id }, job);
    }

    [Authorize(Policy = "RequireEmployerRole")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateJob(int id, [FromBody] UpdateJobRequest request)
    {
        var employerId = GetRequiredUserId();
        var updatedJob = await _jobService.UpdateJobAsync(employerId, id, request);
        return Ok(updatedJob);
    }

    [Authorize(Policy = "RequireEmployerRole")]
    [HttpPatch("{id:int}/cancel")]
    public async Task<IActionResult> CancelJob(int id)
    {
        var employerId = GetRequiredUserId();
        await _jobService.CancelJobAsync(employerId, id);
        return Ok(new { message = "Hủy công việc thành công." });
    }

    [Authorize(Policy = "RequireEmployerRole")]
    [HttpGet("mine")]
    public async Task<IActionResult> GetMyJobs([FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var employerId = GetRequiredUserId();
        var jobs = await _jobService.GetEmployerJobsAsync(employerId, status, page, pageSize);
        return Ok(jobs);
    }

    [Authorize(Policy = "RequireStudentRole")]
    [HttpPost("{id:int}/save")]
    public async Task<IActionResult> SaveJob(int id)
    {
        var studentId = GetRequiredUserId();
        await _jobService.SaveJobAsync(studentId, id);
        return Ok(new { message = "Lưu công việc thành công." });
    }

    [Authorize(Policy = "RequireStudentRole")]
    [HttpDelete("{id:int}/save")]
    public async Task<IActionResult> UnsaveJob(int id)
    {
        var studentId = GetRequiredUserId();
        await _jobService.UnsaveJobAsync(studentId, id);
        return Ok(new { message = "Bỏ lưu công việc thành công." });
    }

    [Authorize(Policy = "RequireStudentRole")]
    [HttpGet("saved")]
    public async Task<IActionResult> GetSavedJobs([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var studentId = GetRequiredUserId();
        var jobs = await _jobService.GetSavedJobsAsync(studentId, page, pageSize);
        return Ok(jobs);
    }

    [Authorize(Policy = "RequireStudentRole")]
    [HttpGet("saved-ids")]
    public async Task<IActionResult> GetSavedJobIds()
    {
        var studentId = GetRequiredUserId();
        var ids = await _jobService.GetSavedJobIdsAsync(studentId);
        return Ok(ids);
    }

    private int? GetCurrentUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!string.IsNullOrEmpty(idClaim) && int.TryParse(idClaim, out var userId))
        {
            return userId;
        }
        return null;
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
