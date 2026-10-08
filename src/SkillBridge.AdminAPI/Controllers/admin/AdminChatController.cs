using System;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Chat;
using SkillBridge.Application.Interfaces.Chat;
using SkillBridge.Infrastructure.Data;

namespace SkillBridge.AdminAPI.Controllers.admin;

/// <summary>
/// Controller Quản trị Hộp thư Tin nhắn Trực tuyến giữa Admin và Người dùng (User / Employer)
/// </summary>
[ApiController]
[Route("api/admin/chat")]
[Authorize(Policy = "RequireAdminRole")]
[EnableRateLimiting("GeneralApiPolicy")]
public class AdminChatController : ControllerBase
{
    private readonly IChatService _chatService;
    private readonly SkillBridgeDbContext _dbContext;

    public AdminChatController(IChatService chatService, SkillBridgeDbContext dbContext)
    {
        _chatService = chatService;
        _dbContext = dbContext;
    }

    private async Task<int> GetEffectiveAdminUserIdAsync(CancellationToken ct)
    {
        // Hộp thư CSKH Hỗ trợ Trực tuyến là hộp thư dùng chung của Ban Quản trị hệ thống SkillBridge.
        // Ưu tiên tài khoản Quản trị viên Hỗ trợ Hệ thống (skillbridge.vn@gmail.com hoặc admin role).
        var systemAdmin = await _dbContext.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Email == "skillbridge.vn@gmail.com" || (u.Role != null && u.Role.Type == "admin"), ct);

        if (systemAdmin != null)
        {
            return systemAdmin.Id;
        }

        // Fallback theo token claim
        var claimId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(claimId, out var uid) && uid > 0)
        {
            return uid;
        }

        throw new BusinessException("Không tìm thấy tài khoản quản trị viên tương ứng trong hệ thống.");
    }

    /// <summary>
    /// Lấy danh sách tất cả các cuộc hội thoại hỗ trợ giữa người dùng và Admin
    /// </summary>
    [HttpGet("conversations")]
    public async Task<IActionResult> GetConversations(CancellationToken ct = default)
    {
        var adminUserId = await GetEffectiveAdminUserIdAsync(ct);
        var conversations = await _chatService.GetConversationsAsync(adminUserId, "chat", ct);
        return Ok(conversations);
    }

    /// <summary>
    /// Lấy lịch sử tin nhắn của một cuộc hội thoại cụ thể
    /// </summary>
    [HttpGet("conversations/{id:int}/messages")]
    public async Task<IActionResult> GetMessages(
        int id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        var adminUserId = await GetEffectiveAdminUserIdAsync(ct);
        var messages = await _chatService.GetMessagesAsync(adminUserId, id, page, pageSize, ct);
        await _chatService.MarkAsReadAsync(adminUserId, id, ct);
        return Ok(messages);
    }

    /// <summary>
    /// Admin gửi phản hồi / tin nhắn trả lời trực tiếp cho người dùng
    /// </summary>
    [HttpPost("conversations/{id:int}/messages")]
    public async Task<IActionResult> SendMessage(
        int id,
        [FromBody] SendMessageRequestDto request,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.MessageText) && string.IsNullOrWhiteSpace(request.AttachmentUrl))
        {
            return BadRequest(new { message = "Nội dung tin nhắn không được để trống." });
        }

        var adminUserId = await GetEffectiveAdminUserIdAsync(ct);
        var result = await _chatService.SendMessageAsync(adminUserId, id, request, ct);
        return Ok(result);
    }

    /// <summary>
    /// Đánh dấu Admin đã đọc tin nhắn trong cuộc hội thoại
    /// </summary>
    [HttpPatch("conversations/{id:int}/read")]
    [HttpPost("conversations/{id:int}/read")]
    public async Task<IActionResult> MarkAsRead(int id, CancellationToken ct = default)
    {
        var adminUserId = await GetEffectiveAdminUserIdAsync(ct);
        await _chatService.MarkAsReadAsync(adminUserId, id, ct);
        return Ok(new { success = true });
    }
}
