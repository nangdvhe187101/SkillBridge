using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.Application.DTOs;
using SkillBridge.Application.Interfaces.Auth;

namespace SkillBridge.API.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class LogoutController : ControllerBase
    {
        private readonly ILogoutService logoutService;
        public LogoutController(ILogoutService _logoutService)
        {
            logoutService = _logoutService;
        }
        [HttpPost("logout")]
        public async Task<IActionResult> Logout([FromBody] RefreshTokenDto dto)
        {
            await logoutService.LogoutAsync(dto.RefreshToken);
            return Ok(new { message = "Đã đăng xuất" });
        }
    }
}