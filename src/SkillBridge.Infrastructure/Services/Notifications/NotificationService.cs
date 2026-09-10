using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Interfaces.Notifications;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Services.Notifications;

public class NotificationService : INotificationService
{
    private readonly SkillBridgeDbContext _dbContext;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(SkillBridgeDbContext dbContext, ILogger<NotificationService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task SendAsync(int userId, string icon, string message, string? link = null, CancellationToken cancellationToken = default)
    {
        var notif = new Notification
        {
            UserId = userId,
            Icon = icon,
            MessageText = message,
            Link = link,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        await _dbContext.Notifications.AddAsync(notif, cancellationToken);
        _logger.LogInformation("Đã tạo thông báo [{Icon}] cho UserId {UserId}: {Message}", icon, userId, message);
    }
}
