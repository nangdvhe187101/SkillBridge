using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Logging;
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
        private readonly IGoogleAuthService _googleAuthService;
        private readonly ILogger<GoogleAuthController> _logger;

        public GoogleAuthController(IGoogleAuthService googleAuthService, ILogger<GoogleAuthController> logger)
        {
            _googleAuthService = googleAuthService;
            _logger = logger;
        }

        [HttpPost("google")]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginDto dto)
        {
            try
            {
                var (result, refreshToken) = await _googleAuthService.GoogleLoginAsync(dto);
                Response.SetRefreshTokenCookie(refreshToken);
                return Ok(result);
            }
            catch (BusinessException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi xảy ra trong quá trình xác thực Google Login");
                return StatusCode(500, new { message = "Đã xảy ra lỗi trong quá trình xác thực với Google. Vui lòng thử lại sau." });
            }
        }
    }
}
