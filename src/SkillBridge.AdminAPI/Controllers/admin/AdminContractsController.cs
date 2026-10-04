using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.AdminAPI.Common;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Admin;
using SkillBridge.Application.Interfaces;

namespace SkillBridge.AdminAPI.Controllers.admin;

[ApiController]
[Route("api/admin/contracts")]
[Authorize(Policy = "RequireAdminRole")]
[EnableRateLimiting("GeneralApiPolicy")]
public class AdminContractsController : ControllerBase
{
    private readonly IAdminContractService _contractService;

    public AdminContractsController(IAdminContractService contractService)
    {
        _contractService = contractService;
    }

    /// <summary>
    /// Thống kê tổng quan KPI giám sát hợp đồng & ký quỹ Escrow (REQ-CEM-01)
    /// </summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var stats = await _contractService.GetContractStatsAsync();
        return Ok(stats);
    }

    /// <summary>
    /// Lấy danh sách hợp đồng kèm bộ lọc, tìm kiếm và phân trang (REQ-CEM-02)
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetContracts(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _contractService.GetContractsAsync(search, status, page, pageSize);
        return Ok(result);
    }

    /// <summary>
    /// Lấy chi tiết hợp đồng, danh sách deliverable và tin nhắn chat gần nhất (REQ-CEM-03)
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetContractDetail([FromRoute] int id)
    {
        var detail = await _contractService.GetContractDetailAsync(id);
        if (detail == null)
        {
            return NotFound(new { message = $"Không tìm thấy hợp đồng #{id}" });
        }
        return Ok(detail);
    }

    /// <summary>
    /// Cưỡng chế giải ngân Escrow cho Sinh viên (Force Release - REQ-CEM-04)
    /// </summary>
    [HttpPost("{id:int}/force-release")]
    public async Task<IActionResult> ForceRelease(
        [FromRoute] int id,
        [FromBody] ForceContractActionRequestDto request)
    {
        var adminUserId = User.GetRequiredUserId();
        try
        {
            var result = await _contractService.ForceReleaseAsync(id, adminUserId, request);
            return Ok(new { success = result, message = "Thực hiện cưỡng chế giải ngân thành công" });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (BusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Cưỡng chế hoàn cọc Escrow cho Nhà tuyển dụng (Force Refund - REQ-CEM-05)
    /// </summary>
    [HttpPost("{id:int}/force-refund")]
    public async Task<IActionResult> ForceRefund(
        [FromRoute] int id,
        [FromBody] ForceContractActionRequestDto request)
    {
        var adminUserId = User.GetRequiredUserId();
        try
        {
            var result = await _contractService.ForceRefundAsync(id, adminUserId, request);
            return Ok(new { success = result, message = "Thực hiện cưỡng chế hoàn cọc thành công" });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (BusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Phê duyệt bước 2 (Checker Approval) cho lệnh cưỡng chế > 5.000.000 VNĐ (REQ-CEM-06)
    /// </summary>
    [HttpPost("{id:int}/checker-approve")]
    public async Task<IActionResult> ApproveChecker([FromRoute] int id)
    {
        var adminUserId = User.GetRequiredUserId();
        try
        {
            var result = await _contractService.ApproveCheckerAsync(id, adminUserId);
            return Ok(new { success = result, message = "Phê duyệt bước 2 thành công" });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (BusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
