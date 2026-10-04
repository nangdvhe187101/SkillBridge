using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.AdminAPI.Common;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Admin;
using SkillBridge.Application.Interfaces.Admin;

namespace SkillBridge.AdminAPI.Controllers.admin;

/// <summary>
/// Controller Quản trị Hỗ trợ Người dùng (Customer Support Tickets)
/// </summary>
[ApiController]
[Route("api/admin/tickets")]
[Authorize(Policy = "RequireAdminRole")]
[EnableRateLimiting("GeneralApiPolicy")]
public class AdminTicketsController : ControllerBase
{
    private readonly IAdminSupportService _supportService;

    public AdminTicketsController(IAdminSupportService supportService)
    {
        _supportService = supportService;
    }

    /// <summary>
    /// Tra cứu danh sách ticket hỗ trợ người dùng có tìm kiếm, lọc theo trạng thái và phân trang
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetTickets(
        [FromQuery] string? searchTerm,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var result = await _supportService.GetTicketsAsync(searchTerm, status, page, pageSize, ct);
        return Ok(result);
    }

    /// <summary>
    /// Lấy thông tin chi tiết một ticket
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetTicketDetail(
        [FromRoute] int id,
        CancellationToken ct = default)
    {
        var ticket = await _supportService.GetTicketDetailAsync(id, ct);
        if (ticket == null)
        {
            return NotFound(new { message = $"Không tìm thấy ticket hỗ trợ #{id}." });
        }
        return Ok(ticket);
    }

    /// <summary>
    /// Gửi phản hồi CSKH tới người dùng và/hoặc đóng ticket hỗ trợ
    /// </summary>
    [HttpPost("{id:int}/reply")]
    public async Task<IActionResult> ReplyAndResolveTicket(
        [FromRoute] int id,
        [FromBody] AdminResolveTicketDto dto,
        CancellationToken ct = default)
    {
        var adminUserId = User.GetRequiredUserId();
        try
        {
            var result = await _supportService.ReplyAndResolveTicketAsync(id, adminUserId, dto, ct);
            return Ok(result);
        }
        catch (BusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
