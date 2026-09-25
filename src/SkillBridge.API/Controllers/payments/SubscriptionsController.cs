using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.API.Common;
using SkillBridge.Application.DTOs.Payments;
using SkillBridge.Application.Interfaces.Payments;

namespace SkillBridge.API.Controllers.payments;

[ApiController]
[Route("api/subscriptions")]
[Authorize]
public class SubscriptionsController : ControllerBase
{
    private readonly ISubscriptionService _subscriptionService;
    private readonly ISubscriptionPlanConfigService _planConfigService;

    public SubscriptionsController(
        ISubscriptionService subscriptionService,
        ISubscriptionPlanConfigService planConfigService)
    {
        _subscriptionService = subscriptionService;
        _planConfigService = planConfigService;
    }

    [HttpGet("plans")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublicPlans(CancellationToken cancellationToken)
    {
        var result = await _planConfigService.GetPublicPlansAsync(cancellationToken);
        return Ok(result);
    }

    [HttpPost("purchase")]
    [EnableRateLimiting("ResourceCreationPolicy")]
    public async Task<IActionResult> PurchaseSubscription(
        [FromBody] PurchaseSubscriptionRequest request,
        CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var result = await _subscriptionService.PurchaseSubscriptionAsync(userId, request, cancellationToken);
        return Ok(result);
    }
}
