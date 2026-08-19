using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.API.Common;
using SkillBridge.Application.Common;
using SkillBridge.Application.Interfaces;

namespace SkillBridge.API.Controllers
{
    [ApiController]
    [Route("api/auth")]
    [EnableRateLimiting("AuthPolicy")]
    public class RefreshTokenController : ControllerBase
    {
        private readonly IRefreshTokenService refreshTokenService;

        public RefreshTokenController(IRefreshTokenService _refreshTokenService)
        {
            refreshTokenService = _refreshTokenService;
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh()
        {
            var refreshToken = Request.Cookies[CookieHelper.RefreshCookieName];
            if (string.IsNullOrEmpty(refreshToken))
                return Unauthorized(new { message = "Không tìm thấy phiên làm việc" });

            try
            {
                var (result, newRefreshToken) = await refreshTokenService.RefreshAsync(refreshToken);
                Response.SetRefreshTokenCookie(newRefreshToken);
                return Ok(result);
            }
            catch (BusinessException ex)
            {
                Response.ClearRefreshTokenCookie();
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}