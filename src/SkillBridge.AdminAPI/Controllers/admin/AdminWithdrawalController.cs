using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.AdminAPI.Common;
using SkillBridge.Application.DTOs.Payments;
using SkillBridge.Application.Interfaces.Payments;

namespace SkillBridge.AdminAPI.Controllers.admin;

[ApiController]
[Route("api/admin/withdrawals")]
[Authorize(Policy = "RequireAdminRole")]
public class AdminWithdrawalController : ControllerBase
{
    private readonly IWithdrawalService _withdrawalService;

    public AdminWithdrawalController(IWithdrawalService withdrawalService)
    {
        _withdrawalService = withdrawalService;
    }

    [HttpGet]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetList(
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await _withdrawalService.GetAdminListAsync(status, page, pageSize, cancellationToken);
        return Ok(result);
    }

    [HttpPost("{id}/approve")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> Approve(
        [FromRoute] int id,
        [FromBody] AdminApproveWithdrawalDto? dto,
        CancellationToken cancellationToken)
    {
        var adminUserId = User.GetRequiredUserId();
        var result = await _withdrawalService.ApproveWithdrawalAsync(adminUserId, id, dto, cancellationToken);
        return Ok(result);
    }

    [HttpPost("{id}/reject")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> Reject(
        [FromRoute] int id,
        [FromBody] AdminRejectWithdrawalDto dto,
        CancellationToken cancellationToken)
    {
        var adminUserId = User.GetRequiredUserId();
        var result = await _withdrawalService.RejectWithdrawalAsync(adminUserId, id, dto, cancellationToken);
        return Ok(result);
    }
}
