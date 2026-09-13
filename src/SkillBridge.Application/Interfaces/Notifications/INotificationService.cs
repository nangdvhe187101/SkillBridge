using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Notifications;

namespace SkillBridge.Application.Interfaces.Notifications;

public interface INotificationService
{
    Task SendAsync(int userId, string icon, string message, string? link = null, CancellationToken cancellationToken = default);
    Task<PaginatedNotificationsDto> GetUserNotificationsAsync(int userId, int page = 1, int pageSize = 20, CancellationToken cancellationToken = default);
    Task MarkAsReadAsync(int userId, int notificationId, CancellationToken cancellationToken = default);
    Task MarkAllAsReadAsync(int userId, CancellationToken cancellationToken = default);
}
