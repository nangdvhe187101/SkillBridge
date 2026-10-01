using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.AdminAPI.Common;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Disputes;
using SkillBridge.Application.Interfaces.Disputes;

namespace SkillBridge.AdminAPI.Controllers.admin;

[ApiController]
[Route("api/admin/disputes")]
[Authorize(Policy = "RequireAdminRole")]
[EnableRateLimiting("GeneralApiPolicy")]
public class AdminDisputesController : ControllerBase
{
    private readonly IDisputeService _disputeService;

    public AdminDisputesController(IDisputeService disputeService)
    {
        _disputeService = disputeService;
    }

    /// <summary>
    /// Lấy danh sách toàn bộ các vụ việc tranh chấp
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetDisputes([FromQuery] string? status, CancellationToken ct)
    {
        var list = await _disputeService.GetAdminDisputesAsync(status, ct);
        return Ok(list);
    }

    /// <summary>
    /// Xem bằng chứng tin nhắn đối với tranh chấp đang mở
    /// </summary>
    [HttpGet("{disputeId:int}/chat-evidence")]
    public async Task<IActionResult> GetChatEvidence([FromRoute] int disputeId, CancellationToken ct)
    {
        var adminUserId = User.GetRequiredUserId();
        try
        {
            var evidence = await _disputeService.GetChatEvidenceAsync(adminUserId, disputeId, ct);
            return Ok(evidence);
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
    /// Ban hành phán quyết trọng tài giải quyết tranh chấp (chấp thuận, bác bỏ, phân chia tỷ lệ)
    /// </summary>
    [HttpPost("{disputeId:int}/resolve")]
    public async Task<IActionResult> ResolveDispute([FromRoute] int disputeId, [FromBody] ResolveDisputeRequest request, CancellationToken ct)
    {
        var adminUserId = User.GetRequiredUserId();
        try
        {
            var result = await _disputeService.ResolveDisputeAsync(adminUserId, disputeId, request, ct);
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
}
