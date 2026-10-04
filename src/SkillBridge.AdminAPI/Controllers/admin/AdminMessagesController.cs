using System;
using System.Collections.Generic;
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

[ApiController]
[Route("api/admin/messages")]
[Authorize(Policy = "RequireAdminRole")]
[EnableRateLimiting("GeneralApiPolicy")]
public class AdminMessagesController : ControllerBase
{
    private readonly IAdminMessageService _messageService;

    public AdminMessagesController(IAdminMessageService messageService)
    {
        _messageService = messageService;
    }

    /// <summary>
    /// Lấy danh sách cuộc trò chuyện trên hệ thống (tìm kiếm, lọc theo trạng thái, phát hiện gian lận)
    /// </summary>
    [HttpGet("conversations")]
    public async Task<IActionResult> GetConversations(
        [FromQuery] string? query,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var result = await _messageService.GetConversationsAsync(query, status, page, pageSize, ct);
        return Ok(result);
    }

    /// <summary>
    /// Xem chi tiết cuộc trò chuyện và toàn bộ lịch sử tin nhắn đối soát (Q-006 / Q-015)
    /// </summary>
    [HttpGet("conversations/{id:int}")]
    public async Task<IActionResult> GetConversationDetail(
        [FromRoute] int id,
        CancellationToken ct)
    {
        var adminUserId = User.GetRequiredUserId();
        try
        {
            var result = await _messageService.GetConversationDetailAsync(adminUserId, id, ct);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Phát tin nhắn cảnh báo màu cam của hệ thống vào phòng chat nghi vấn gian lận
    /// </summary>
    [HttpPost("conversations/{id:int}/warn")]
    public async Task<IActionResult> WarnConversation(
        [FromRoute] int id,
        [FromBody] AdminWarnChatDto? dto,
        CancellationToken ct)
    {
        var adminUserId = User.GetRequiredUserId();
        try
        {
            var success = await _messageService.WarnConversationAsync(adminUserId, id, dto, ct);
            return Ok(new { success, message = "Đã phát cảnh báo gian lận vào phòng chat thành công." });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (BusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Khóa phòng chat vi phạm chính sách giao dịch
    /// </summary>
    [HttpPost("conversations/{id:int}/lock")]
    public async Task<IActionResult> LockConversation(
        [FromRoute] int id,
        [FromBody] AdminLockChatDto? dto,
        CancellationToken ct)
    {
        var adminUserId = User.GetRequiredUserId();
        try
        {
            var success = await _messageService.LockConversationAsync(adminUserId, id, dto, ct);
            return Ok(new { success, message = "Đã khóa phòng chat thành công." });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (BusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Phát thông báo hệ thống tới toàn sàn hoặc theo nhóm người dùng (Broadcast)
    /// </summary>
    [HttpPost("broadcast")]
    public async Task<IActionResult> SendBroadcast(
        [FromBody] AdminBroadcastDto dto,
        CancellationToken ct)
    {
        var adminUserId = User.GetRequiredUserId();
        try
        {
            var recipientCount = await _messageService.SendBroadcastAsync(adminUserId, dto, ct);
            return Ok(new
            {
                success = true,
                recipientCount,
                message = $"Đã phát thông báo thành công tới {recipientCount} người dùng."
            });
        }
        catch (BusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
