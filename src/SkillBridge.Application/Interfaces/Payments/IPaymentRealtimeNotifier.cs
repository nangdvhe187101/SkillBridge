using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Payments;

namespace SkillBridge.Application.Interfaces.Payments;

public interface IPaymentRealtimeNotifier
{
    Task NotifyPaymentSuccessAsync(string orderCode, PaymentOrderStatusDto status, CancellationToken ct = default);
}
