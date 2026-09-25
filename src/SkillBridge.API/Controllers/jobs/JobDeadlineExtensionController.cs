using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.API.Common;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Jobs;
using SkillBridge.Application.Interfaces.Jobs;

namespace SkillBridge.API.Controllers.jobs;

[ApiController]
[Route("api/jobs/{jobId:int}/deadline-extensions")]
[Authorize]
public class JobDeadlineExtensionController : ControllerBase
{
    private readonly IJobDeadlineExtensionService _extensionService;

    public JobDeadlineExtensionController(IJobDeadlineExtensionService extensionService)
    {
        _extensionService = extensionService;
    }

    /// <summary>
    /// Sinh viên gửi yêu cầu xin gia hạn deadline
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "RequireStudentRole")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> RequestExtension(
        int jobId,
        [FromBody] CreateDeadlineExtensionRequest request,
        CancellationToken ct = default)
    {
        var studentId = User.GetRequiredUserId();
        try
        {
            var result = await _extensionService.RequestExtensionAsync(studentId, jobId, request, ct);
            return StatusCode(201, result);
        }
        catch (BusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Lấy yêu cầu gia hạn đang chờ xử lý của công việc
    /// </summary>
    [HttpGet("active")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetActiveExtension(int jobId, CancellationToken ct = default)
    {
        var userId = User.GetRequiredUserId();
        try
        {
            var result = await _extensionService.GetActiveExtensionAsync(userId, jobId, ct);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Lấy toàn bộ lịch sử xin gia hạn deadline của công việc
    /// </summary>
    [HttpGet("history")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetExtensionHistory(int jobId, CancellationToken ct = default)
    {
        var userId = User.GetRequiredUserId();
        try
        {
            var result = await _extensionService.GetExtensionHistoryAsync(userId, jobId, ct);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
        catch (BusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Nhà tuyển dụng phê duyệt hoặc từ chối yêu cầu gia hạn deadline
    /// </summary>
    [HttpPost("{extensionId:int}/respond")]
    [Authorize(Policy = "RequireEmployerRole")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> RespondExtension(
        int jobId,
        int extensionId,
        [FromBody] RespondDeadlineExtensionRequest request,
        CancellationToken ct = default)
    {
        var employerId = User.GetRequiredUserId();
        try
        {
            await _extensionService.RespondExtensionAsync(employerId, jobId, extensionId, request, ct);
            return Ok(new { message = request.Action == "accept" ? "Đã chấp thuận gia hạn deadline thành công." : "Đã từ chối gia hạn deadline." });
        }
        catch (BusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Sinh viên chủ động thu hồi/hủy yêu cầu gia hạn đang chờ
    /// </summary>
    [HttpPost("{extensionId:int}/cancel")]
    [Authorize(Policy = "RequireStudentRole")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> CancelExtension(
        int jobId,
        int extensionId,
        CancellationToken ct = default)
    {
        var studentId = User.GetRequiredUserId();
        try
        {
            await _extensionService.CancelExtensionAsync(studentId, jobId, extensionId, ct);
            return Ok(new { message = "Đã thu hồi yêu cầu gia hạn deadline." });
        }
        catch (BusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
    }
}
