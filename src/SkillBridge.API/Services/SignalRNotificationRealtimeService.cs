using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using SkillBridge.API.Hubs;
using SkillBridge.Application.DTOs.Notifications;
using SkillBridge.Application.Interfaces.Notifications;

namespace SkillBridge.API.Services;

public class SignalRNotificationRealtimeService : INotificationRealtimeNotifier
{
    private readonly IHubContext<ChatHub> _hubContext;
    private readonly ILogger<SignalRNotificationRealtimeService> _logger;

    public SignalRNotificationRealtimeService(
        IHubContext<ChatHub> hubContext,
        ILogger<SignalRNotificationRealtimeService> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task NotifyAsync(int userId, NotificationDto notification, CancellationToken ct = default)
    {
        try
        {
            var userGroup = $"user_{userId}";
            _logger.LogInformation("SignalR: Phát thông báo thời gian thực tới {UserGroup}: {Message}", userGroup, notification.MessageText);
            await _hubContext.Clients.Group(userGroup).SendAsync("ReceiveNotification", notification, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi phát thông báo SignalR tới UserId {UserId}", userId);
        }
    }

    public async Task NotifyApplicationStatusChangedAsync(int studentId, int jobId, string status, string jobTitle, CancellationToken ct = default)
    {
        try
        {
            var userGroup = $"user_{studentId}";
            _logger.LogInformation("SignalR: Phát sự kiện ApplicationStatusChanged tới {UserGroup} cho Job #{JobId} ({Status})", userGroup, jobId, status);
            await _hubContext.Clients.Group(userGroup).SendAsync("ApplicationStatusChanged", new
            {
                jobId,
                status,
                jobTitle
            }, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi phát sự kiện SignalR ApplicationStatusChanged tới StudentId {StudentId}", studentId);
        }
    }
}
