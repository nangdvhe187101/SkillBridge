using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Payments;

namespace SkillBridge.Application.Interfaces.Payments;

public interface ISubscriptionService
{
    Task<SubscriptionResponseDto> PurchaseSubscriptionAsync(int userId, PurchaseSubscriptionRequest request, CancellationToken cancellationToken = default);
}
