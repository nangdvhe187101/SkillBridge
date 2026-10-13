using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.API.Common;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Support;
using SkillBridge.Application.Interfaces.Support;

namespace SkillBridge.API.Controllers.support;

/// <summary>
/// Controller tiếp nhận yêu cầu hỗ trợ, thắc mắc và khiếu nại dịch vụ từ người dùng và khách vãng lai
/// </summary>
[ApiController]
[Route("api/tickets")]
[Route("api/contact")]
[EnableRateLimiting("ContactFormPolicy")]
public class TicketsController : ControllerBase
{
    private readonly ISupportTicketService _ticketService;

    public TicketsController(ISupportTicketService ticketService)
    {
        _ticketService = ticketService;
    }

    /// <summary>
    /// Gửi yêu cầu hỗ trợ / khiếu nại (Hỗ trợ cả người dùng đã đăng nhập hoặc khách vãng lai)
    /// </summary>
    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> CreateTicket(
        [FromBody] CreateSupportTicketDto dto,
        CancellationToken ct = default)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var authenticatedUserId = User.GetCurrentUserId();
            var result = await _ticketService.CreateTicketAsync(dto, authenticatedUserId, ct);
            return StatusCode(StatusCodes.Status201Created, result);
        }
        catch (BusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
