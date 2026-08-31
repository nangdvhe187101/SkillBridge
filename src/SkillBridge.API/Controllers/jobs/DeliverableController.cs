using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
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
    public async Task<IActionResult> GetDeliverables(int jobId)
    {
        var userId = GetRequiredUserId();
        var deliverables = await _deliverableService.GetDeliverablesByJobIdAsync(userId, jobId);
        return Ok(deliverables);
    }

    [HttpPost]
    [Authorize(Policy = "RequireStudentRole")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> SubmitDeliverable(
        int jobId,
        [FromForm] IFormFile? file,
        [FromForm] string? externalUrl,
        [FromForm] string? note)
    {
        var studentId = GetRequiredUserId();

        using var stream = file?.OpenReadStream();
        var result = await _deliverableService.SubmitDeliverableAsync(
            studentId,
            jobId,
            stream,
            file?.FileName,
            file?.ContentType,
            externalUrl,
            note);

        return Ok(result);
    }

    [HttpPost("{deliverableId:int}/review")]
    [Authorize(Policy = "RequireEmployerRole")]
    public async Task<IActionResult> ReviewDeliverable(
        int jobId,
        int deliverableId,
        [FromBody] ReviewDeliverableRequest request)
    {
        var employerId = GetRequiredUserId();
        var result = await _deliverableService.ReviewDeliverableAsync(employerId, jobId, deliverableId, request);
        return Ok(result);
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
