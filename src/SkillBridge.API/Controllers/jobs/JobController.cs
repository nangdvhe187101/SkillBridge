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
    private readonly IJobAttachmentService _jobAttachmentService;

    public JobController(IJobService jobService, IJobAttachmentService jobAttachmentService)
    {
        _jobService = jobService;
        _jobAttachmentService = jobAttachmentService;
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
        return Ok(new { message = "Đóng/hủy công việc thành công." });
    }

    [Authorize(Policy = "RequireEmployerRole")]
    [HttpPatch("{id:int}/reopen")]
    [EnableRateLimiting("ResourceCreationPolicy")]
    public async Task<IActionResult> ReopenJob(int id)
    {
        var employerId = User.GetRequiredUserId();
        await _jobService.ReopenJobAsync(employerId, id);
        return Ok(new { message = "Mở lại tin tuyển dụng thành công." });
    }

    [Authorize(Policy = "RequireEmployerRole")]
    [HttpDelete("{id:int}")]
    [EnableRateLimiting("ResourceCreationPolicy")]
    public async Task<IActionResult> DeleteJob(int id)
    {
        var employerId = User.GetRequiredUserId();
        await _jobService.DeleteJobAsync(employerId, id);
        return Ok(new { message = "Xóa tin tuyển dụng thành công." });
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

    [Authorize(Policy = "RequireEmployerRole")]
    [HttpPost("{id:int}/attachments")]
    [Consumes("multipart/form-data")]
    [EnableRateLimiting("UploadPolicy")]
    public async Task<IActionResult> UploadJobAttachment(int id, [FromForm] Microsoft.AspNetCore.Http.IFormFile file)
    {
        var employerId = User.GetRequiredUserId();
        using var stream = file?.OpenReadStream();
        if (stream == null)
        {
            return BadRequest(new { message = "Vui lòng chọn tệp tin đính kèm." });
        }

        var result = await _jobAttachmentService.UploadJobAttachmentAsync(
            employerId,
            id,
            stream,
            file!.FileName,
            file.ContentType);

        return Ok(result);
    }

    [Authorize(Policy = "RequireEmployerRole")]
    [HttpDelete("{id:int}/attachments/{attachmentId:int}")]
    [EnableRateLimiting("ResourceCreationPolicy")]
    public async Task<IActionResult> DeleteJobAttachment(int id, int attachmentId)
    {
        var employerId = User.GetRequiredUserId();
        await _jobAttachmentService.DeleteJobAttachmentAsync(employerId, id, attachmentId);
        return Ok(new { message = "Xóa tệp đính kèm thành công." });
    }

    [HttpGet("{id:int}/attachments/{attachmentId:int}/download")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> DownloadJobAttachment(int id, int attachmentId, System.Threading.CancellationToken cancellationToken)
    {
        var fileResult = await _jobAttachmentService.GetAttachmentFileStreamAsync(id, attachmentId, cancellationToken);
        if (fileResult == null)
        {
            return NotFound(new { message = "Không tìm thấy file đính kèm hoặc file không còn tồn tại trên bộ nhớ lưu trữ." });
        }

        return File(fileResult.Value.Stream, fileResult.Value.ContentType, fileResult.Value.FileName, enableRangeProcessing: true);
    }
}
