using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.Application.DTOs.Payments;
using SkillBridge.Application.Interfaces.Payments;

namespace SkillBridge.AdminAPI.Controllers.admin;

[ApiController]
[Route("api/admin/subscription-plans")]
[Authorize(Policy = "RequireAdminRole")]
public class AdminSubscriptionPlansController : ControllerBase
{
    private readonly ISubscriptionPlanConfigService _planConfigService;

    public AdminSubscriptionPlansController(ISubscriptionPlanConfigService planConfigService)
    {
        _planConfigService = planConfigService;
    }

    [HttpGet]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetAllPlans(CancellationToken cancellationToken)
    {
        var plans = await _planConfigService.GetAllPlansForAdminAsync(cancellationToken);
        return Ok(plans);
    }

    [HttpGet("{id:int}")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetPlanById(int id, CancellationToken cancellationToken)
    {
        var plan = await _planConfigService.GetPlanByIdAsync(id, cancellationToken);
        return Ok(plan);
    }

    [HttpPut("{id:int}")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> UpdatePlan(int id, [FromBody] UpdateSubscriptionPlanConfigRequest request, CancellationToken cancellationToken)
    {
        var updated = await _planConfigService.UpdatePlanAsync(id, request, cancellationToken);
        return Ok(updated);
    }

    [HttpPost]
    [EnableRateLimiting("ResourceCreationPolicy")]
    public async Task<IActionResult> CreatePlan([FromBody] CreateSubscriptionPlanConfigRequest request, CancellationToken cancellationToken)
    {
        var created = await _planConfigService.CreatePlanAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetPlanById), new { id = created.Id }, created);
    }

    [HttpDelete("{id:int}")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> DeletePlan(int id, CancellationToken cancellationToken)
    {
        await _planConfigService.DeletePlanAsync(id, cancellationToken);
        return Ok(new { id, message = "Đã xóa gói dịch vụ thành công." });
    }

    [HttpPost("{id:int}/toggle")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> ToggleActive(int id, CancellationToken cancellationToken)
    {
        var isActive = await _planConfigService.TogglePlanActiveAsync(id, cancellationToken);
        return Ok(new { id, isActive, message = isActive ? "Gói đã được kích hoạt thành công." : "Gói đã được tạm ngưng kích hoạt." });
    }
}
