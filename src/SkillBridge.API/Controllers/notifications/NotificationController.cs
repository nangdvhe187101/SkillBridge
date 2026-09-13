using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.API.Common;
using SkillBridge.Application.Interfaces.Notifications;

namespace SkillBridge.API.Controllers.notifications;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationController : ControllerBase
{
    private readonly INotificationService _notificationService;

    public NotificationController(INotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    [HttpGet]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetMyNotifications(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var userId = User.GetRequiredUserId();
        var result = await _notificationService.GetUserNotificationsAsync(userId, page, pageSize, cancellationToken);
        return Ok(result);
    }

    [HttpPatch("{id:int}/read")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> MarkAsRead(int id, CancellationToken cancellationToken = default)
    {
        var userId = User.GetRequiredUserId();
        await _notificationService.MarkAsReadAsync(userId, id, cancellationToken);
        return Ok(new { success = true });
    }

    [HttpPost("read-all")]
    [HttpPatch("read-all")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> MarkAllAsRead(CancellationToken cancellationToken = default)
    {
        var userId = User.GetRequiredUserId();
        await _notificationService.MarkAllAsReadAsync(userId, cancellationToken);
        return Ok(new { success = true });
    }
}
