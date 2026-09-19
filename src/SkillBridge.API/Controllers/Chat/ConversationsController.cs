using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.API.Common;
using SkillBridge.Application.DTOs.Chat;
using SkillBridge.Application.Interfaces.Chat;

namespace SkillBridge.API.Controllers.Chat;

[ApiController]
[Route("api/conversations")]
[Authorize]
public class ConversationsController : ControllerBase
{
    private readonly IChatService _chatService;

    public ConversationsController(IChatService chatService)
    {
        _chatService = chatService;
    }

    /// <summary>
    /// Lấy danh sách các cuộc trò chuyện của người dùng hiện tại (hỗ trợ tab "chat" hoặc "request")
    /// </summary>
    [HttpGet]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetConversations(
        [FromQuery] string? tab = null,
        CancellationToken cancellationToken = default)
    {
        var userId = User.GetRequiredUserId();
        var result = await _chatService.GetConversationsAsync(userId, tab, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Lấy lịch sử tin nhắn của cuộc trò chuyện (có phân trang)
    /// </summary>
    [HttpGet("{id:int}/messages")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetMessages(
        int id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 30,
        CancellationToken cancellationToken = default)
    {
        var userId = User.GetRequiredUserId();
        var result = await _chatService.GetMessagesAsync(userId, id, page, pageSize, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Bắt đầu hoặc lấy cuộc trò chuyện với người dùng khác (kèm ngữ cảnh Job nếu có)
    /// </summary>
    [HttpPost("start")]
    [EnableRateLimiting("ResourceCreationPolicy")]
    public async Task<IActionResult> StartConversation(
        [FromBody] StartConversationRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var userId = User.GetRequiredUserId();
        var result = await _chatService.GetOrCreateConversationAsync(userId, request, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Gửi tin nhắn mới vào cuộc trò chuyện
    /// </summary>
    [HttpPost("{id:int}/messages")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> SendMessage(
        int id,
        [FromBody] SendMessageRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var userId = User.GetRequiredUserId();
        var result = await _chatService.SendMessageAsync(userId, id, request, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Đánh dấu đã đọc tất cả tin nhắn trong cuộc trò chuyện (hỗ trợ Stealth Mode cho tab Yêu cầu)
    /// </summary>
    [HttpPatch("{id:int}/read")]
    [HttpPost("{id:int}/read")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> MarkAsRead(int id, CancellationToken cancellationToken = default)
    {
        var userId = User.GetRequiredUserId();
        await _chatService.MarkAsReadAsync(userId, id, cancellationToken);
        return Ok(new { success = true });
    }

    /// <summary>
    /// Lưu trữ hoặc bỏ lưu trữ cuộc hội thoại
    /// </summary>
    [HttpPatch("{id:int}/archive")]
    [HttpPost("{id:int}/archive")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> ToggleArchive(
        int id,
        [FromBody] ToggleArchiveRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var userId = User.GetRequiredUserId();
        await _chatService.ToggleArchiveConversationAsync(userId, id, request.Archive, cancellationToken);
        return Ok(new { success = true });
    }

    /// <summary>
    /// Chấp nhận yêu cầu tin nhắn từ tab Yêu cầu -> Chuyển sang tab Trò chuyện chính thức
    /// </summary>
    [HttpPost("{id:int}/accept-request")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> AcceptRequest(int id, CancellationToken cancellationToken = default)
    {
        var userId = User.GetRequiredUserId();
        await _chatService.AcceptMessageRequestAsync(userId, id, cancellationToken);
        return Ok(new { success = true });
    }

    /// <summary>
    /// Từ chối yêu cầu tin nhắn từ tab Yêu cầu
    /// </summary>
    [HttpPost("{id:int}/decline-request")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> DeclineRequest(int id, CancellationToken cancellationToken = default)
    {
        var userId = User.GetRequiredUserId();
        await _chatService.DeclineMessageRequestAsync(userId, id, cancellationToken);
        return Ok(new { success = true });
    }

    /// <summary>
    /// Tải lên tệp đính kèm (hình ảnh, âm thanh, video, tài liệu) cho cuộc hội thoại
    /// </summary>
    [HttpPost("{id:int}/attachments")]
    [Consumes("multipart/form-data")]
    [EnableRateLimiting("UploadPolicy")]
    public async Task<IActionResult> UploadAttachment(
        [FromRoute] int id,
        [FromForm] IFormFile file,
        CancellationToken cancellationToken = default)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "Vui lòng chọn tệp tin cần tải lên." });
        }

        var userId = User.GetRequiredUserId();
        using var stream = file.OpenReadStream();
        var result = await _chatService.UploadAttachmentAsync(
            userId,
            id,
            stream,
            file.FileName,
            file.ContentType,
            file.Length,
            cancellationToken);

        return Ok(result);
    }
}
