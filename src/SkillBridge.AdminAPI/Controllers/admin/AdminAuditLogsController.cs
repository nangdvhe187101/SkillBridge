using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.Application.Interfaces.Admin;

namespace SkillBridge.AdminAPI.Controllers.admin;

/// <summary>
/// Controller Tra cứu Nhật ký Kiểm toán Hệ thống (Audit Trail)
/// Bất biến (INV-SEC-03): Chỉ cung cấp API đọc, nghiêm cấm sửa hoặc xóa dữ liệu kiểm toán.
/// </summary>
[ApiController]
[Route("api/admin/audit-logs")]
[Authorize(Policy = "RequireAdminRole")]
[EnableRateLimiting("GeneralApiPolicy")]
public class AdminAuditLogsController : ControllerBase
{
    private readonly IAdminSupportService _supportService;

    public AdminAuditLogsController(IAdminSupportService supportService)
    {
        _supportService = supportService;
    }

    /// <summary>
    /// Tra cứu lịch sử kiểm toán toàn hệ thống có lọc theo từ khóa, tài khoản thực hiện, khoảng thời gian và phân trang
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAuditLogs(
        [FromQuery] string? searchTerm,
        [FromQuery] int? actorId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var result = await _supportService.GetAuditLogsAsync(searchTerm, actorId, fromDate, toDate, page, pageSize, ct);
        return Ok(result);
    }
}
