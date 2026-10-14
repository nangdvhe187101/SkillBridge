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

namespace SkillBridge.API.Controllers
{
    [ApiController]
    [Route("api/auth")]
    [EnableRateLimiting("AuthPolicy")]
    public class LoginController : ControllerBase
    {
        private readonly ILoginService loginService;
        private readonly IAdminSecurityService _securityService;

        public LoginController(ILoginService _loginService, IAdminSecurityService securityService)
        {
            loginService = _loginService;
            _securityService = securityService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            try
            {
                var (result, refreshToken) = await loginService.LoginAsync(dto);
                Response.SetRefreshTokenCookie(refreshToken);

                var ipAddress = HttpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault()
                    ?? HttpContext.Connection.RemoteIpAddress?.ToString();
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