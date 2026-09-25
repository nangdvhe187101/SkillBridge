using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.API.Common;
using SkillBridge.Application.DTOs.Reports;
using SkillBridge.Application.Interfaces.Reports;

namespace SkillBridge.API.Controllers.reports;

[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    [HttpPost]
    [EnableRateLimiting("ResourceCreationPolicy")]
    public async Task<IActionResult> CreateReport([FromBody] CreateReportRequest request)
    {
        var reporterId = User.GetRequiredUserId();
        var result = await _reportService.CreateReportAsync(reporterId, request);
        return Ok(new
        {
            message = "Báo cáo của bạn đã được gửi tới Ban Quản trị xét duyệt.",
            report = result
        });
    }
}
