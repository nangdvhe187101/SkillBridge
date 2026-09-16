using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
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
    private readonly IBankVerificationService _bankVerificationService;

    public WalletController(
        IWalletService walletService,
        IBankVerificationService bankVerificationService)
    {
        _walletService = walletService;
        _bankVerificationService = bankVerificationService;
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
    [HttpPost("bank-account")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> UpdateBankAccount([FromBody] UpdateBankAccountRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var wallet = await _walletService.UpdateBankAccountAsync(userId, request, cancellationToken);
        return Ok(wallet);
    }

    [Authorize]
    [HttpPost("bank-verification/request")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> CreateVerificationRequest(
        [FromBody] CreateBankVerificationDto dto,
        CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _bankVerificationService.CreateRequestAsync(userId, dto, ip, cancellationToken);
        return Ok(result);
    }

    [Authorize]
    [HttpPost("bank-verification/decode-qr")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> DecodeBankQr(
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "Vui lòng tải lên file ảnh mã QR." });
        }

        using var stream = file.OpenReadStream();
        var result = await _bankVerificationService.DecodeQrImageAsync(stream, file.FileName, cancellationToken);
        return Ok(result);
    }

    [Authorize]
    [HttpPost("bank-verification/{id}/cancel")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> CancelVerificationRequest(
        [FromRoute] int id,
        CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var result = await _bankVerificationService.CancelRequestAsync(userId, id, cancellationToken);
        return Ok(result);
    }

    [Authorize]
    [HttpGet("bank-verification/current")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetCurrentVerification(CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var result = await _bankVerificationService.GetCurrentVerificationAsync(userId, cancellationToken);
        return Ok(result);
    }
}
