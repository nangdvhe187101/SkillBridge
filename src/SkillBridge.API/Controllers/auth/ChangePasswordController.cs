using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
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
    public class ChangePasswordController : ControllerBase
    {
        private readonly IChangePasswordService changePasswordService;

        public ChangePasswordController(IChangePasswordService _changePasswordService)
        {
            changePasswordService = _changePasswordService;
        }

        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Phiên đăng nhập không hợp lệ" });
            }

            try
            {
                var message = await changePasswordService.ChangePasswordAsync(userId, dto);
                Response.ClearRefreshTokenCookie();
                return Ok(new { message });
            }
            catch (BusinessException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
