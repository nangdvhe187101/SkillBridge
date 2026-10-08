using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.Application.Interfaces.Admin;

namespace SkillBridge.AdminAPI.Controllers.admin;

[ApiController]
[Route("api/admin/analytics")]
[Authorize(Policy = "RequireAdminRole")]
[EnableRateLimiting("GeneralApiPolicy")]
public class AdminAnalyticsController : ControllerBase
{
    private readonly IAdminAnalyticsService _analyticsService;

    public AdminAnalyticsController(IAdminAnalyticsService analyticsService)
    {
        _analyticsService = analyticsService;
    }

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview(CancellationToken ct)
    {
        var overview = await _analyticsService.GetOverviewAsync(ct);
        return Ok(overview);
    }
}
