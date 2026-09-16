using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.API.Common;
using SkillBridge.Application.DTOs.Payments;
using SkillBridge.Application.Interfaces.Payments;

namespace SkillBridge.API.Controllers.admin;

[ApiController]
[Route("api/admin/bank-verification")]
[Authorize]
public class AdminBankVerificationController : ControllerBase
{
    private readonly IBankVerificationService _bankVerificationService;

    public AdminBankVerificationController(IBankVerificationService bankVerificationService)
    {
        _bankVerificationService = bankVerificationService;
    }

    [HttpGet]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetList(
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        var result = await _bankVerificationService.GetAdminListAsync(status, page, pageSize, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id}")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetDetail([FromRoute] int id, CancellationToken cancellationToken)
    {
        var result = await _bankVerificationService.GetAdminDetailAsync(id, cancellationToken);
        return Ok(result);
    }

    [HttpPost("{id}/approve")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> Approve(
        [FromRoute] int id,
        [FromBody] AdminApproveBankVerificationDto dto,
        CancellationToken cancellationToken)
    {
        var adminUserId = User.GetRequiredUserId();
        var result = await _bankVerificationService.ApproveRequestAsync(adminUserId, id, dto, cancellationToken);
        return Ok(result);
    }

    [HttpPost("{id}/reject")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> Reject(
        [FromRoute] int id,
        [FromBody] AdminRejectBankVerificationDto dto,
        CancellationToken cancellationToken)
    {
        var adminUserId = User.GetRequiredUserId();
        var result = await _bankVerificationService.RejectRequestAsync(adminUserId, id, dto, cancellationToken);
        return Ok(result);
    }
}
