using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.API.Common;
using SkillBridge.Application.Common;
using SkillBridge.Application.Interfaces.Disputes;

namespace SkillBridge.API.Controllers.Admin;

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

    /**
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-011
     */
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
}
