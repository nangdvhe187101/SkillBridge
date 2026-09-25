using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.API.Common;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Disputes;
using SkillBridge.Application.Interfaces.Disputes;

namespace SkillBridge.API.Controllers.Disputes;

[ApiController]
[Route("api/disputes")]
[Authorize]
public class DisputesController : ControllerBase
{
    private readonly IDisputeService _disputeService;

    public DisputesController(IDisputeService disputeService)
    {
        _disputeService = disputeService;
    }

    /// <summary>
    /// Mở khiếu nại tranh chấp cho công việc
    /// </summary>
    [HttpPost]
    [Consumes("multipart/form-data")]
    [EnableRateLimiting("UploadPolicy")]
    public async Task<IActionResult> CreateDispute(
        [FromForm] int jobId,
        [FromForm] string reason,
        [FromForm] string? origin,
        [FromForm] int? deliverableId,
        [FromForm] List<IFormFile>? files,
        [FromForm] List<string>? fileDescriptions,
        CancellationToken ct = default)
    {
        var userId = User.GetRequiredUserId();

        var fileUploadModels = new List<DisputeFileUploadModel>();
        if (files != null && files.Count > 0)
        {
            for (int i = 0; i < files.Count; i++)
            {
                var f = files[i];
                if (f == null || f.Length == 0) continue;
                var desc = (fileDescriptions != null && i < fileDescriptions.Count) ? fileDescriptions[i] : null;
                fileUploadModels.Add(new DisputeFileUploadModel
                {
                    Stream = f.OpenReadStream(),
                    FileName = f.FileName,
                    ContentType = f.ContentType,
                    Description = desc
                });
            }
        }

        var request = new CreateDisputeRequest
        {
            JobId = jobId,
            Reason = reason,
            Origin = origin ?? "manual",
            DeliverableId = deliverableId,
            Files = fileUploadModels
        };

        try
        {
            var result = await _disputeService.CreateDisputeAsync(userId, request, ct);
            return CreatedAtAction(nameof(GetDisputeDetail), new { id = result.Id }, result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
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
    /// Nộp bổ sung tệp chứng cứ (trong vòng 72 giờ từ khi mở khiếu nại)
    /// </summary>
    [HttpPost("{id:int}/evidences")]
    [Consumes("multipart/form-data")]
    [EnableRateLimiting("UploadPolicy")]
    public async Task<IActionResult> AddEvidence(
        [FromRoute] int id,
        [FromForm] IFormFile file,
        [FromForm] string? description,
        CancellationToken ct = default)
    {
        var userId = User.GetRequiredUserId();
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "Vui lòng đính kèm tệp bằng chứng." });
        }

        await using var stream = file.OpenReadStream();
        var request = new AddEvidenceRequest
        {
            Stream = stream,
            FileName = file.FileName,
            ContentType = file.ContentType,
            Description = description ?? "Tệp chứng cứ bổ sung"
        };

        try
        {
            var result = await _disputeService.AddEvidenceAsync(userId, id, request, ct);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
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
    /// Lấy danh sách toàn bộ khiếu nại của người dùng hiện tại (cả vai trò Sinh viên và NTD)
    /// </summary>
    [HttpGet("my")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetMyDisputes(CancellationToken ct = default)
    {
        var userId = User.GetRequiredUserId();
        var list = await _disputeService.GetMyDisputesAsync(userId, ct);
        return Ok(list);
    }

    /// <summary>
    /// Xem chi tiết hồ sơ khiếu nại và danh sách bằng chứng
    /// </summary>
    [HttpGet("{id:int}")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetDisputeDetail([FromRoute] int id, CancellationToken ct = default)
    {
        var userId = User.GetRequiredUserId();
        try
        {
            var detail = await _disputeService.GetDisputeDetailAsync(userId, id, ct);
            return Ok(detail);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
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
}
