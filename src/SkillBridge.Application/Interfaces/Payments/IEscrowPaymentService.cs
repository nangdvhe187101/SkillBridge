using System.Threading;
using System.Threading.Tasks;

namespace SkillBridge.Application.Interfaces.Payments;

public interface IEscrowPaymentService
{
    Task HoldEscrowAsync(int employerId, int jobId, string jobTitle, decimal amount, CancellationToken cancellationToken = default);
    Task ReleaseEscrowAsync(int studentId, int employerId, int jobId, string jobTitle, decimal amount, CancellationToken cancellationToken = default);
    Task RefundEscrowAsync(int employerId, int jobId, string jobTitle, decimal amount, string reason, CancellationToken cancellationToken = default);
}
