using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.AdminAPI.Common;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Users;
using SkillBridge.Application.Interfaces.Users;

namespace SkillBridge.AdminAPI.Controllers.admin;

[ApiController]
[Route("api/admin/users")]
[Authorize(Policy = "RequireAdminRole")]
[EnableRateLimiting("GeneralApiPolicy")]
public class AdminUsersController : ControllerBase
{
    private readonly IAdminUserService _adminUserService;

    public AdminUsersController(IAdminUserService adminUserService)
    {
        _adminUserService = adminUserService;
    }

    /// <summary>
    /// Lấy danh sách người dùng phân trang kèm bộ lọc (Role, Status, SubTab, Search)
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetUsers([FromQuery] AdminUserFilterRequest filter, CancellationToken ct)
    {
        var result = await _adminUserService.GetUsersAsync(filter, ct);
        return Ok(result);
    }

    /// <summary>
    /// Lấy số liệu thống kê tổng quan người dùng (Tổng số, Sinh viên, NTD, Chờ duyệt eKYC, Blacklist, Reliability TB)
    /// </summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetUserStats(CancellationToken ct)
    {
        var stats = await _adminUserService.GetUserStatsAsync(ct);
        return Ok(stats);
    }

    /// <summary>
    /// Lấy thông tin chi tiết hồ sơ người dùng kèm lịch sử hoạt động
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetUserDetail([FromRoute] int id, CancellationToken ct)
    {
        try
        {
            var detail = await _adminUserService.GetUserDetailAsync(id, ct);
            return Ok(detail);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Khóa hoặc mở khóa tài khoản người dùng (tăng TokenVersion hủy phiên ngay lập tức khi khóa)
    /// </summary>
    [HttpPost("{id:int}/lock")]
    public async Task<IActionResult> ToggleLockUser([FromRoute] int id, [FromBody] AdminLockUserRequest? request, CancellationToken ct)
    {
        var adminUserId = User.GetRequiredUserId();
        try
        {
            var result = await _adminUserService.ToggleLockUserAsync(adminUserId, id, request ?? new AdminLockUserRequest(), ct);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (BusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Đưa người dùng vào danh sách đen (Blacklist) vĩnh viễn và hủy phiên ngay lập tức
    /// </summary>
    [HttpPost("{id:int}/blacklist")]
    public async Task<IActionResult> BlacklistUser([FromRoute] int id, [FromBody] AdminBlacklistRequest request, CancellationToken ct)
    {
        var adminUserId = User.GetRequiredUserId();
        try
        {
            var result = await _adminUserService.BlacklistUserAsync(adminUserId, id, request, ct);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (BusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Gỡ người dùng ra khỏi danh sách đen
    /// </summary>
    [HttpPost("{id:int}/unblacklist")]
    public async Task<IActionResult> RemoveFromBlacklist([FromRoute] int id, CancellationToken ct)
    {
        var adminUserId = User.GetRequiredUserId();
        try
        {
            var result = await _adminUserService.RemoveFromBlacklistAsync(adminUserId, id, ct);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (BusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Điều chỉnh điểm uy tín (Reliability Score) có giới hạn biên độ tối đa +-20 điểm
    /// </summary>
    [HttpPost("{id:int}/reliability")]
    public async Task<IActionResult> AdjustReliability([FromRoute] int id, [FromBody] AdminAdjustReliabilityRequest request, CancellationToken ct)
    {
        var adminUserId = User.GetRequiredUserId();
        try
        {
            var result = await _adminUserService.AdjustReliabilityAsync(adminUserId, id, request, ct);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (BusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Phê duyệt xác thực định danh (eKYC) của người dùng
    /// </summary>
    [HttpPost("{id:int}/verify-kyc")]
    public async Task<IActionResult> VerifyKyc([FromRoute] int id, CancellationToken ct)
    {
        var adminUserId = User.GetRequiredUserId();
        try
        {
            var result = await _adminUserService.VerifyKycAsync(adminUserId, id, ct);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (BusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
