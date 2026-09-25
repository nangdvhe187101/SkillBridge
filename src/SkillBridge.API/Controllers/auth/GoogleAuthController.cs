using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.API.Common;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs;
using SkillBridge.Application.Interfaces.Auth;

namespace SkillBridge.API.Controllers
{
    [ApiController]
    [Route("api/auth")]
    [EnableRateLimiting("AuthPolicy")]
    public class GoogleAuthController : ControllerBase
    {
        private readonly IGoogleAuthService googleAuthService;

        public GoogleAuthController(IGoogleAuthService _googleAuthService)
        {
            googleAuthService = _googleAuthService;
        }

        [HttpPost("google")]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginDto dto)
        {
            try
            {
                var (result, refreshToken) = await googleAuthService.GoogleLoginAsync(dto);
                Response.SetRefreshTokenCookie(refreshToken);
                return Ok(result);
            }
            catch (BusinessException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Đã xảy ra lỗi trong quá trình xác thực với Google: " + ex.Message });
            }
        }
    }
}
