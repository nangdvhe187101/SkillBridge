using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.API.Common;
using SkillBridge.Application.DTOs.Jobs;
using SkillBridge.Application.Interfaces.Jobs;

namespace SkillBridge.API.Controllers.jobs;

[ApiController]
[Route("api/jobs/{jobId:int}/deliverables")]
[Authorize]
public class DeliverableController : ControllerBase
{
    private readonly IDeliverableService _deliverableService;

    public DeliverableController(IDeliverableService deliverableService)
    {
        _deliverableService = deliverableService;
    }

    [HttpGet]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetDeliverables(int jobId, CancellationToken cancellationToken = default)
    {
        var userId = User.GetRequiredUserId();
        var deliverables = await _deliverableService.GetDeliverablesByJobIdAsync(userId, jobId, cancellationToken);
        return Ok(deliverables);
    }

    [HttpPost]
    [Authorize(Policy = "RequireStudentRole")]
    [Consumes("multipart/form-data")]
    [EnableRateLimiting("UploadPolicy")]
    public async Task<IActionResult> SubmitDeliverable(
        int jobId,
        [FromForm] IFormFile? file,
        [FromForm] string? externalUrl,
        [FromForm] string? note,
        CancellationToken cancellationToken = default)
    {
        var studentId = User.GetRequiredUserId();

        using var stream = file?.OpenReadStream();
        var result = await _deliverableService.SubmitDeliverableAsync(
            studentId,
            jobId,
            stream,
            file?.FileName,
            file?.ContentType,
            externalUrl,
            note,
            cancellationToken);

        return Ok(result);
    }

    [HttpPost("{deliverableId:int}/review")]
    [Authorize(Policy = "RequireEmployerRole")]
    [EnableRateLimiting("ResourceCreationPolicy")]
    public async Task<IActionResult> ReviewDeliverable(
        int jobId,
        int deliverableId,
        [FromBody] ReviewDeliverableRequest request,
        CancellationToken cancellationToken = default)
    {
        var employerId = User.GetRequiredUserId();
        var result = await _deliverableService.ReviewDeliverableAsync(employerId, jobId, deliverableId, request, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{deliverableId:int}/download")]
    [EnableRateLimiting("GeneralApiPolicy")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> DownloadDeliverable(
        int jobId,
        int deliverableId,
        [FromQuery] string type = "final",
        CancellationToken cancellationToken = default)
    {
        var userId = User.GetRequiredUserId();
        var result = await _deliverableService.GetDeliverableFileStreamAsync(userId, jobId, deliverableId, type, cancellationToken);
        if (!result.HasValue)
        {
            return NotFound(new { message = "Không tìm thấy file sản phẩm bàn giao." });
        }

        var (stream, contentType, fileName) = result.Value;
        if (string.Equals(type, "preview", StringComparison.OrdinalIgnoreCase))
        {
            Response.Headers.ContentDisposition = "inline";
            return File(stream, contentType, enableRangeProcessing: true);
        }

        return File(stream, contentType, fileName, enableRangeProcessing: true);
    }
}
