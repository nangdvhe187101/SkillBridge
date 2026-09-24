using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.API.Common;
using SkillBridge.Application.DTOs.Users;
using SkillBridge.Application.Interfaces.Users;

namespace SkillBridge.API.Controllers.users;

[ApiController]
[Route("api/talents")]
public class TalentsController : ControllerBase
{
    private readonly ITalentService _talentService;

    public TalentsController(ITalentService talentService)
    {
        _talentService = talentService;
    }

    [HttpGet]
    [AllowAnonymous]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetTalents([FromQuery] TalentFilterRequest request, CancellationToken cancellationToken)
    {
        var result = await _talentService.GetTalentsAsync(request, cancellationToken);
        return Ok(result);
    }

    [HttpPost("{studentId:int}/invite")]
    [Authorize(Policy = "RequireEmployerRole")]
    [EnableRateLimiting("ResourceCreationPolicy")]
    public async Task<IActionResult> InviteStudentToJob(
        [FromRoute] int studentId,
        [FromBody] InviteToJobRequest request,
        CancellationToken cancellationToken)
    {
        var employerId = User.GetRequiredUserId();
        var result = await _talentService.InviteStudentToJobAsync(employerId, studentId, request, cancellationToken);
        return Ok(result);
    }
}
