using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.API.Common;
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
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetPublicJobs([FromQuery] JobQueryParameters parameters)
    {
        var currentUserId = User.GetCurrentUserId();
        var result = await _jobService.GetPublicJobsAsync(parameters, currentUserId);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetJobDetail(int id)
    {
        var currentUserId = User.GetCurrentUserId();
        var detail = await _jobService.GetJobDetailAsync(id, currentUserId);
        return Ok(detail);
    }

    [Authorize(Policy = "RequireEmployerRole")]
    [HttpPost]
    [EnableRateLimiting("ResourceCreationPolicy")]
    public async Task<IActionResult> CreateJob([FromBody] CreateJobRequest request)
    {
        var employerId = User.GetRequiredUserId();
        var job = await _jobService.CreateJobAsync(employerId, request);
        return CreatedAtAction(nameof(GetJobDetail), new { id = job.Id }, job);
    }

    [Authorize(Policy = "RequireEmployerRole")]
    [HttpPut("{id:int}")]
    [EnableRateLimiting("ResourceCreationPolicy")]
    public async Task<IActionResult> UpdateJob(int id, [FromBody] UpdateJobRequest request)
    {
        var employerId = User.GetRequiredUserId();
        var updatedJob = await _jobService.UpdateJobAsync(employerId, id, request);
        return Ok(updatedJob);
    }

    [Authorize(Policy = "RequireEmployerRole")]
    [HttpPatch("{id:int}/cancel")]
    [EnableRateLimiting("ResourceCreationPolicy")]
    public async Task<IActionResult> CancelJob(int id)
    {
        var employerId = User.GetRequiredUserId();
        await _jobService.CancelJobAsync(employerId, id);
        return Ok(new { message = "Hủy công việc thành công." });
    }

    [Authorize(Policy = "RequireEmployerRole")]
    [HttpGet("mine")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetMyJobs([FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var employerId = User.GetRequiredUserId();
        var jobs = await _jobService.GetEmployerJobsAsync(employerId, status, page, pageSize);
        return Ok(jobs);
    }

    [Authorize(Policy = "RequireStudentRole")]
    [HttpPost("{id:int}/save")]
    [EnableRateLimiting("ResourceCreationPolicy")]
    public async Task<IActionResult> SaveJob(int id)
    {
        var studentId = User.GetRequiredUserId();
        await _jobService.SaveJobAsync(studentId, id);
        return Ok(new { message = "Lưu công việc thành công." });
    }

    [Authorize(Policy = "RequireStudentRole")]
    [HttpDelete("{id:int}/save")]
    [EnableRateLimiting("ResourceCreationPolicy")]
    public async Task<IActionResult> UnsaveJob(int id)
    {
        var studentId = User.GetRequiredUserId();
        await _jobService.UnsaveJobAsync(studentId, id);
        return Ok(new { message = "Bỏ lưu công việc thành công." });
    }

    [Authorize(Policy = "RequireStudentRole")]
    [HttpGet("saved")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetSavedJobs([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var studentId = User.GetRequiredUserId();
        var jobs = await _jobService.GetSavedJobsAsync(studentId, page, pageSize);
        return Ok(jobs);
    }

    [Authorize(Policy = "RequireStudentRole")]
    [HttpGet("saved-ids")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetSavedJobIds()
    {
        var studentId = User.GetRequiredUserId();
        var ids = await _jobService.GetSavedJobIdsAsync(studentId);
        return Ok(ids);
    }
}
