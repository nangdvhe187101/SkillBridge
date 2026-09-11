using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.API.Common;
using SkillBridge.Application.DTOs.Payments;
using SkillBridge.Application.Interfaces.Payments;

namespace SkillBridge.API.Controllers.payments;

[ApiController]
[Route("api/wallets")]
public class WalletController : ControllerBase
{
    private readonly IWalletService _walletService;

    public WalletController(IWalletService walletService)
    {
        _walletService = walletService;
    }

    [Authorize]
    [HttpGet("me")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetMyWallet(CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var wallet = await _walletService.GetMyWalletAsync(userId, cancellationToken);
        return Ok(wallet);
    }

    [Authorize]
    [HttpPost("topup")]
    [EnableRateLimiting("ResourceCreationPolicy")]
    public async Task<IActionResult> Topup([FromBody] TopupRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var wallet = await _walletService.TopupAsync(userId, request, cancellationToken);
        return Ok(wallet);
    }
}
