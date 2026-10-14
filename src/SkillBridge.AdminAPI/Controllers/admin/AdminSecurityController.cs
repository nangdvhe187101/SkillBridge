using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.Application.Interfaces.Admin;

namespace SkillBridge.AdminAPI.Controllers.admin;

/// <summary>
/// Controller Giám sát Đăng nhập & An ninh Tài khoản (Security & Login Audit)
/// </summary>
[ApiController]
[Route("api/admin/security")]
[Authorize(Policy = "RequireAdminRole")]
[EnableRateLimiting("GeneralApiPolicy")]
public class AdminSecurityController : ControllerBase
{
    private readonly IAdminSecurityService _securityService;

    public AdminSecurityController(IAdminSecurityService securityService)
    {
        _securityService = securityService;
    }

    /// <summary>
    /// Lấy danh sách lịch sử các phiên đăng nhập mới nhất của toàn bộ tài khoản
    /// </summary>
    [HttpGet("login-history")]
    public async Task<IActionResult> GetLoginHistory(
        [FromQuery] string? role,
        [FromQuery] string? query,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var result = await _securityService.GetLoginHistoryAsync(role, query, page, pageSize, ct);
        return Ok(result);
    }

    /// <summary>
    /// Lấy chỉ số KPI thống kê đăng nhập trong ngày và trong 24 giờ qua
    /// </summary>
    [HttpGet("login-stats")]
    public async Task<IActionResult> GetLoginStats(CancellationToken ct = default)
    {
        var stats = await _securityService.GetLoginStatsAsync(ct);
        return Ok(stats);
    }
}
