using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Notifications;

namespace SkillBridge.Application.Interfaces.Notifications;

public interface INotificationRealtimeNotifier
{
    Task NotifyAsync(int userId, NotificationDto notification, CancellationToken ct = default);
    Task NotifyApplicationStatusChangedAsync(int studentId, int jobId, string status, string jobTitle, CancellationToken ct = default);
}
