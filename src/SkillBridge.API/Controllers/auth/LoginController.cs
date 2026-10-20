using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.API.Common;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs;
using SkillBridge.Application.Interfaces;
using SkillBridge.Application.Interfaces.Admin;
using SkillBridge.Infrastructure.Services.Security;

namespace SkillBridge.API.Controllers
{
    [ApiController]
    [Route("api/auth")]
    [EnableRateLimiting("AuthPolicy")]
    public class LoginController : ControllerBase
    {
        private readonly ILoginService loginService;
        private readonly IAdminSecurityService _securityService;
        private readonly ITurnstileService _turnstileService;

        public LoginController(ILoginService _loginService, IAdminSecurityService securityService, ITurnstileService turnstileService)
        {
            loginService = _loginService;
            _securityService = securityService;
            _turnstileService = turnstileService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var ipAddress = HttpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault()
                ?? HttpContext.Connection.RemoteIpAddress?.ToString();

            if (!await _turnstileService.PassesBotCheckAsync(HttpContext, dto.CompanyWebsite, dto.TurnstileToken))
            {
                return BadRequest(new { message = BotCheckExtensions.FailureMessage });
            }

            try
            {
                var (result, refreshToken) = await loginService.LoginAsync(dto);
                Response.SetRefreshTokenCookie(refreshToken);

                var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();

                _ = _securityService.RecordLoginEventAsync(
                    result.UserId,
                    "LOGIN_SUCCESS",
                    ipAddress,
                    userAgent,
                    "password"
                );

                return Ok(result);
            }
            catch (BusinessException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}