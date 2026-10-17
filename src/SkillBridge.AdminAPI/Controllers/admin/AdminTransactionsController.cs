using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.Application.Interfaces.Admin;

namespace SkillBridge.AdminAPI.Controllers.admin;

/// <summary>
/// Quản lý giao dịch cho Admin: xem, lọc và thống kê toàn bộ bảng transactions
/// (nạp tiền, giữ/hoàn tiền rút, hoa hồng, phí gói, quảng cáo, hoàn bảo hiểm, thưởng giới thiệu...).
/// Chỉ đọc dữ liệu, không cho sửa số liệu tài chính đã ghi nhận.
/// </summary>
[ApiController]
[Route("api/admin/transactions")]
[Authorize(Policy = "RequireAdminRole")]
public class AdminTransactionsController : ControllerBase
{
    private readonly IAdminTransactionService _transactionService;

    public AdminTransactionsController(IAdminTransactionService transactionService)
    {
        _transactionService = transactionService;
    }

    [HttpGet]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetList(
        [FromQuery] string? type,
        [FromQuery] int? userId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? keyword,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var result = await _transactionService.GetListAsync(type, userId, fromDate, toDate, keyword, page, pageSize, ct);
        return Ok(result);
    }

    [HttpGet("summary")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetSummary(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        CancellationToken ct = default)
    {
        var result = await _transactionService.GetSummaryAsync(fromDate, toDate, ct);
        return Ok(result);
    }
}
