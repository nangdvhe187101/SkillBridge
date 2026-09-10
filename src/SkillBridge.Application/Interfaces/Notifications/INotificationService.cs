using System.Threading;
using System.Threading.Tasks;

namespace SkillBridge.Application.Interfaces.Notifications;

public interface INotificationService
{
    Task SendAsync(int userId, string icon, string message, string? link = null, CancellationToken cancellationToken = default);
}
