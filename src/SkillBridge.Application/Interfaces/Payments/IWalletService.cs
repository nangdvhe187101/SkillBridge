using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Payments;

namespace SkillBridge.Application.Interfaces.Payments;

public interface IWalletService
{
    Task<WalletResponseDto> GetMyWalletAsync(int userId, CancellationToken cancellationToken = default);
    Task<WalletResponseDto> TopupAsync(int userId, TopupRequest request, CancellationToken cancellationToken = default);
}
