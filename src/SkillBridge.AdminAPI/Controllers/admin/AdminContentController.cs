using System;
using System.Collections.Generic;
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

[ApiController]
[Route("api/admin/content")]
[Authorize(Policy = "RequireAdminRole")]
[EnableRateLimiting("GeneralApiPolicy")]
public class AdminContentController : ControllerBase
{
    private readonly IAdminContentService _contentService;

    public AdminContentController(IAdminContentService contentService)
    {
        _contentService = contentService;
    }

    /// <summary>
    /// Lấy danh sách hàng đợi tin tuyển dụng cần kiểm duyệt phân trang và lọc theo rủi ro
    /// </summary>
    [HttpGet("moderation")]
    public async Task<IActionResult> GetModerationQueue([FromQuery] AdminModerationFilterRequest filter, CancellationToken ct)
    {
        var result = await _contentService.GetModerationQueueAsync(filter, ct);
        return Ok(result);
    }

    /// <summary>
    /// Lấy số liệu thống kê tổng quan kiểm duyệt nội dung sàn
    /// </summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetContentStats(CancellationToken ct)
    {
        var stats = await _contentService.GetContentStatsAsync(ct);
        return Ok(stats);
    }

    /// <summary>
    /// Phê duyệt tin tuyển dụng hiển thị công khai trên sàn
    /// </summary>
    [HttpPost("jobs/{jobId:int}/approve")]
    public async Task<IActionResult> ApproveJob([FromRoute] int jobId, [FromBody] AdminApproveJobRequest? request, CancellationToken ct)
    {
        var adminUserId = User.GetRequiredUserId();
        try
        {
            var success = await _contentService.ApproveJobAsync(adminUserId, jobId, request, ct);
            return Ok(new { success, message = "Đã phê duyệt tin tuyển dụng thành công." });
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
    /// Từ chối tin tuyển dụng kèm lý do giải thích
    /// </summary>
    [HttpPost("jobs/{jobId:int}/reject")]
    public async Task<IActionResult> RejectJob([FromRoute] int jobId, [FromBody] AdminRejectJobRequest request, CancellationToken ct)
    {
        var adminUserId = User.GetRequiredUserId();
        try
        {
            var success = await _contentService.RejectJobAsync(adminUserId, jobId, request, ct);
            return Ok(new { success, message = "Đã từ chối tin tuyển dụng." });
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
    /// Gửi cảnh báo vi phạm liêm chính/chính sách tới nhà tuyển dụng đăng tin
    /// </summary>
    [HttpPost("jobs/{jobId:int}/warn")]
    public async Task<IActionResult> WarnPoster([FromRoute] int jobId, [FromBody] AdminWarnPosterRequest request, CancellationToken ct)
    {
        var adminUserId = User.GetRequiredUserId();
        try
        {
            var success = await _contentService.WarnPosterAsync(adminUserId, jobId, request, ct);
            return Ok(new { success, message = "Đã gửi cảnh báo tới nhà tuyển dụng." });
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
    /// Lấy danh sách danh mục ngành nghề toàn sàn
    /// </summary>
    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories(CancellationToken ct)
    {
        var categories = await _contentService.GetCategoriesAsync(ct);
        return Ok(categories);
    }

    /// <summary>
    /// Tạo mới một danh mục ngành nghề
    /// </summary>
    [HttpPost("categories")]
    public async Task<IActionResult> CreateCategory([FromBody] AdminCreateCategoryRequest request, CancellationToken ct)
    {
        var adminUserId = User.GetRequiredUserId();
        try
        {
            var created = await _contentService.CreateCategoryAsync(adminUserId, request, ct);
            return StatusCode(201, created);
        }
        catch (BusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Xóa một danh mục ngành nghề (khi chưa có tin ràng buộc)
    /// </summary>
    [HttpDelete("categories/{categoryId:int}")]
    public async Task<IActionResult> DeleteCategory([FromRoute] int categoryId, CancellationToken ct)
    {
        var adminUserId = User.GetRequiredUserId();
        try
        {
            var success = await _contentService.DeleteCategoryAsync(adminUserId, categoryId, ct);
            return Ok(new { success, message = "Đã xóa danh mục thành công." });
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
    /// Lấy danh sách yêu cầu tin nổi bật (Featured Requests)
    /// </summary>
    [HttpGet("featured")]
    public async Task<IActionResult> GetFeaturedRequests(CancellationToken ct)
    {
        var list = await _contentService.GetFeaturedRequestsAsync(ct);
        return Ok(list);
    }

    /// <summary>
    /// Phê duyệt tin nổi bật và kích hoạt thời hạn 7 ngày
    /// </summary>
    [HttpPost("featured/{featuredRequestId:int}/approve")]
    public async Task<IActionResult> ApproveFeatured([FromRoute] int featuredRequestId, CancellationToken ct)
    {
        var adminUserId = User.GetRequiredUserId();
        try
        {
            var success = await _contentService.ApproveFeaturedAsync(adminUserId, featuredRequestId, ct);
            return Ok(new { success, message = "Đã phê duyệt gói Featured Listing 7 ngày." });
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
