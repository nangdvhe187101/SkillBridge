using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.Application.DTOs.Admin;
using SkillBridge.Application.Interfaces.Admin;

namespace SkillBridge.AdminAPI.Controllers.admin;

[ApiController]
[Route("api/admin")]
[Authorize(Policy = "RequireAdminRole")]
public class AdminSettingsController : ControllerBase
{
    private readonly ISystemSettingService _systemSettingService;

    public AdminSettingsController(ISystemSettingService systemSettingService)
    {
        _systemSettingService = systemSettingService;
    }

    [HttpGet("settings")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetSettings(CancellationToken cancellationToken)
    {
        var settings = await _systemSettingService.GetSettingsAsync(cancellationToken);
        return Ok(settings);
    }

    [HttpPost("settings")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> UpdateSettings([FromBody] UpdateSystemSettingsRequest request, CancellationToken cancellationToken)
    {
        var settings = await _systemSettingService.UpdateSettingsAsync(request, cancellationToken);
        return Ok(settings);
    }

    [HttpPost("trigger/auto-accept-scan")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> TriggerAutoAcceptScan(CancellationToken cancellationToken)
    {
        var result = await _systemSettingService.TriggerAutoAcceptScanAsync(cancellationToken);
        return Ok(result);
    }

    [HttpPost("trigger/reconcile-payments")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> TriggerPaymentReconciliation(CancellationToken cancellationToken)
    {
        var result = await _systemSettingService.TriggerPaymentReconciliationAsync(cancellationToken);
        return Ok(result);
    }
}
