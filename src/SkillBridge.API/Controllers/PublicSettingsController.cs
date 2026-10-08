using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.Application.Interfaces.Admin;

namespace SkillBridge.API.Controllers;

[ApiController]
[Route("api/public")]
[AllowAnonymous]
[EnableRateLimiting("GeneralApiPolicy")]
public class PublicSettingsController : ControllerBase
{
    private readonly ISystemSettingService _systemSettingService;

    public PublicSettingsController(ISystemSettingService systemSettingService)
    {
        _systemSettingService = systemSettingService;
    }

    /// <summary>
    /// Lấy các cấu hình hệ thống công khai cho giao diện người dùng (Bật/tắt giới thiệu, loại quà, giá CPC)
    /// </summary>
    [HttpGet("system-configs")]
    public async Task<IActionResult> GetPublicSystemConfigs(CancellationToken ct)
    {
        var settings = await _systemSettingService.GetSettingsAsync(ct);

        return Ok(new
        {
            referralProgramEnabled = settings.ReferralProgramEnabled,
            referralRewardType = settings.ReferralRewardType,
            referralRewardValue = settings.ReferralRewardValue,
            referralRewardTarget = settings.ReferralRewardTarget,
            cpcClickPrice = settings.CpcClickPrice,

            // Company & Contact Information
            companyName = settings.CompanyName,
            projectName = settings.ProjectName,
            projectLead = settings.ProjectLead,
            projectLeadTitle = settings.ProjectLeadTitle,
            techLead = settings.TechLead,
            techLeadTitle = settings.TechLeadTitle,
            address = settings.Address,
            hotline1 = settings.Hotline1,
            hotline2 = settings.Hotline2,
            email = settings.Email,
            workingHours = settings.WorkingHours
        });
    }
}
