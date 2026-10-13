using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.AdminAPI.Common;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Admin;
using SkillBridge.Application.Interfaces.Admin;

namespace SkillBridge.AdminAPI.Controllers.admin;

/// <summary>
/// Controller Quản trị Đội ngũ Quản trị & Ma trận Phân quyền URL (RBAC)
/// </summary>
[ApiController]
[Route("api/admin/roles")]
[Authorize(Policy = "RequireAdminRole")]
[EnableRateLimiting("GeneralApiPolicy")]
public class AdminRolesController : ControllerBase
{
    private readonly IAdminRoleService _roleService;
    private readonly Microsoft.Extensions.Logging.ILogger<AdminRolesController> _logger;

    public AdminRolesController(
        IAdminRoleService roleService,
        Microsoft.Extensions.Logging.ILogger<AdminRolesController> logger)
    {
        _roleService = roleService;
        _logger = logger;
    }

    /// <summary>
    /// Lấy danh sách thành viên đội ngũ quản trị nội bộ
    /// </summary>
    [HttpGet("team")]
    public async Task<IActionResult> GetTeamMembers(CancellationToken ct = default)
    {
        var members = await _roleService.GetTeamMembersAsync(ct);
        return Ok(members);
    }

    /// <summary>
    /// Thêm thành viên mới vào đội ngũ quản trị
    /// </summary>
    [HttpPost("team")]
    public async Task<IActionResult> AddTeamMember(
        [FromBody] CreateAdminTeamMemberDto dto,
        CancellationToken ct = default)
    {
        var actorAdminId = User.GetRequiredUserId();
        try
        {
            var result = await _roleService.AddTeamMemberAsync(dto, actorAdminId, ct);
            return Ok(result);
        }
        catch (BusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            var errorDetail = ex.InnerException?.Message ?? ex.Message;
            _logger.LogError(ex, "Lỗi khi thêm thành viên quản trị: {Message}", errorDetail);
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Lỗi hệ thống khi thêm thành viên: " + errorDetail });
        }
    }

    /// <summary>
    /// Cập nhật vai trò hoặc trạng thái thành viên quản trị
    /// </summary>
    [HttpPut("team/{id:int}")]
    public async Task<IActionResult> UpdateTeamMember(
        [FromRoute] int id,
        [FromBody] UpdateAdminTeamMemberRoleDto dto,
        CancellationToken ct = default)
    {
        var actorAdminId = User.GetRequiredUserId();
        try
        {
            var result = await _roleService.UpdateTeamMemberRoleAsync(id, dto, actorAdminId, ct);
            return Ok(result);
        }
        catch (BusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            var errorDetail = ex.InnerException?.Message ?? ex.Message;
            _logger.LogError(ex, "Lỗi khi cập nhật thành viên quản trị #{MemberId}: {Message}", id, errorDetail);
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Lỗi hệ thống khi cập nhật thành viên: " + errorDetail });
        }
    }

    /// <summary>
    /// Xóa thành viên khỏi đội ngũ quản trị
    /// </summary>
    [HttpDelete("team/{id:int}")]
    public async Task<IActionResult> DeleteTeamMember(
        [FromRoute] int id,
        CancellationToken ct = default)
    {
        var actorAdminId = User.GetRequiredUserId();
        try
        {
            await _roleService.DeleteTeamMemberAsync(id, actorAdminId, ct);
            return Ok(new { message = "Đã xóa thành viên khỏi đội ngũ quản trị thành công." });
        }
        catch (BusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            var errorDetail = ex.InnerException?.Message ?? ex.Message;
            _logger.LogError(ex, "Lỗi khi xóa thành viên quản trị #{MemberId}: {Message}", id, errorDetail);
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Lỗi hệ thống khi xóa thành viên: " + errorDetail });
        }
    }

    /// <summary>
    /// Khôi phục tài khoản user (sinh viên/nhà tuyển dụng) bị chuyển nhầm thành nhân sự quản trị
    /// </summary>
    [HttpPost("team/{id:int}/restore-user")]
    public async Task<IActionResult> RestoreUserAccount(
        [FromRoute] int id,
        [FromBody] RestoreUserAccountDto dto,
        CancellationToken ct = default)
    {
        var actorAdminId = User.GetRequiredUserId();
        try
        {
            var result = await _roleService.RestoreUserAccountAsync(id, dto, actorAdminId, ct);
            return Ok(result);
        }
        catch (BusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi khôi phục tài khoản user từ thành viên quản trị #{MemberId}", id);
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Lỗi hệ thống khi khôi phục tài khoản." });
        }
    }

    /// <summary>
    /// Lấy danh sách các vai trò quản trị nội bộ
    /// </summary>
    [HttpGet("roles")]
    public async Task<IActionResult> GetRoles(CancellationToken ct = default)
    {
        var roles = await _roleService.GetRolesAsync(ct);
        return Ok(roles);
    }

    /// <summary>
    /// Lấy ma trận phân quyền URL Route & Tính năng cho từng Role
    /// </summary>
    [HttpGet("matrix")]
    public async Task<IActionResult> GetPermissionMatrix(CancellationToken ct = default)
    {
        var matrix = await _roleService.GetPermissionMatrixAsync(ct);
        return Ok(matrix);
    }

    /// <summary>
    /// Thêm một URL route / tính năng mới vào ma trận phân quyền
    /// </summary>
    [HttpPost("matrix")]
    public async Task<IActionResult> AddPermissionRoute(
        [FromBody] CreatePermissionDto dto,
        CancellationToken ct = default)
    {
        var actorAdminId = User.GetRequiredUserId();
        try
        {
            var result = await _roleService.AddPermissionRouteAsync(dto, actorAdminId, ct);
            return Ok(result);
        }
        catch (BusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Bật hoặc tắt quyền của một Role trên URL route
    /// </summary>
    [HttpPost("matrix/toggle")]
    public async Task<IActionResult> ToggleRolePermission(
        [FromBody] ToggleRolePermissionDto dto,
        CancellationToken ct = default)
    {
        var actorAdminId = User.GetRequiredUserId();
        try
        {
            await _roleService.ToggleRolePermissionAsync(dto, actorAdminId, ct);
            return Ok(new { message = "Cập nhật quyền truy cập thành công." });
        }
        catch (BusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Xóa một URL route / tính năng khỏi ma trận phân quyền
    /// </summary>
    [HttpDelete("matrix/{id:int}")]
    public async Task<IActionResult> DeletePermissionRoute(
        [FromRoute] int id,
        CancellationToken ct = default)
    {
        var actorAdminId = User.GetRequiredUserId();
        try
        {
            await _roleService.DeletePermissionRouteAsync(id, actorAdminId, ct);
            return Ok(new { message = "Đã xóa tính năng khỏi ma trận RBAC." });
        }
        catch (BusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
