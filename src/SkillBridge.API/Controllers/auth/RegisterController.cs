using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.API.Common;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs;
using SkillBridge.Application.Interfaces;
using SkillBridge.Infrastructure.Services.Security;

namespace SkillBridge.API.Controllers;

[ApiController]
[Route("api/auth")]
[EnableRateLimiting("AuthPolicy")]
public class RegisterController : ControllerBase
{
    private readonly IRegisterService _registerService;
    private readonly ITurnstileService _turnstileService;

    public RegisterController(IRegisterService registerService, ITurnstileService turnstileService)
    {
        _registerService = registerService;
        _turnstileService = turnstileService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        if (!await _turnstileService.PassesBotCheckAsync(HttpContext, dto.CompanyWebsite, dto.TurnstileToken))
        {
            return BadRequest(new { message = BotCheckExtensions.FailureMessage });
        }

        try
        {
            var result = await _registerService.RegisterAsync(dto);
            return StatusCode(201, result);
        }
        catch (BusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}