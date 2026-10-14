using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Logging;
using SkillBridge.API.Common;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs;
using SkillBridge.Application.Interfaces.Admin;
using SkillBridge.Application.Interfaces.Auth;

namespace SkillBridge.API.Controllers
{
    [ApiController]
    [Route("api/auth")]
    [EnableRateLimiting("AuthPolicy")]
    public class GoogleAuthController : ControllerBase
    {
        private readonly IGoogleAuthService _googleAuthService;
        private readonly IAdminSecurityService _securityService;
        private readonly ILogger<GoogleAuthController> _logger;

        public GoogleAuthController(
            IGoogleAuthService googleAuthService,
            IAdminSecurityService securityService,
            ILogger<GoogleAuthController> logger)
        {
            _googleAuthService = googleAuthService;
            _securityService = securityService;
            _logger = logger;
        }

        [HttpPost("google")]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginDto dto)
        {
            try
            {
                var (result, refreshToken) = await _googleAuthService.GoogleLoginAsync(dto);
                Response.SetRefreshTokenCookie(refreshToken);

                var ipAddress = HttpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault()
                    ?? HttpContext.Connection.RemoteIpAddress?.ToString();
                var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();

                _ = _securityService.RecordLoginEventAsync(
                    result.UserId,
                    "LOGIN_SUCCESS",
                    ipAddress,
                    userAgent,
                    "google_sso"
                );

                return Ok(result);
            }
            catch (BusinessException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi xảy ra trong quá trình xác thực Google Login. Message: {Message}, Inner: {Inner}",
                    ex.Message, ex.InnerException?.Message);
                return StatusCode(500, new { message = "Đã xảy ra lỗi trong quá trình xác thực với Google. Vui lòng thử lại sau." });
            }
        }
    }
}
