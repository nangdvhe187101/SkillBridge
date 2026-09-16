using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Payments;
using SkillBridge.Application.Interfaces.Payments;

namespace SkillBridge.AdminAPI.Services;

public class NullPaymentRealtimeNotifier : IPaymentRealtimeNotifier
{
    public Task NotifyPaymentSuccessAsync(string orderCode, PaymentOrderStatusDto status, CancellationToken ct = default)
    {
        return Task.CompletedTask;
    }
}
