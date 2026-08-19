using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.API.Common;
using SkillBridge.Application.Interfaces.Auth;

namespace SkillBridge.API.Controllers
{
    [ApiController]
    [Route("api/auth")]
    [EnableRateLimiting("AuthPolicy")]
    public class LogoutController : ControllerBase
    {
        private readonly ILogoutService logoutService;
        public LogoutController(ILogoutService _logoutService)
        {
            logoutService = _logoutService;
        }
        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            var refreshToken = Request.Cookies[CookieHelper.RefreshCookieName];
            if (!string.IsNullOrEmpty(refreshToken))
                await logoutService.LogoutAsync(refreshToken);

            Response.ClearRefreshTokenCookie();
            return Ok(new { message = "Đã đăng xuất" });
        }
    }
}