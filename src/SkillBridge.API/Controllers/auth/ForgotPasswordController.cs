using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs;
using SkillBridge.Application.Interfaces.Auth;

namespace SkillBridge.API.Controllers
{
    [ApiController]
    [Route("api/auth/forgot-password")]
    [EnableRateLimiting("AuthPolicy")]
    public class ForgotPasswordController : ControllerBase
    {
        private readonly IForgotPasswordService forgotPasswordService;

        public ForgotPasswordController(IForgotPasswordService _forgotPasswordService)
        {
            forgotPasswordService = _forgotPasswordService;
        }

        [HttpPost("request-otp")]
        public async Task<IActionResult> RequestOtp([FromBody] ForgotPasswordRequestDto dto)
        {
            try
            {
                var message = await forgotPasswordService.RequestOtpAsync(dto);
                return Ok(new { message });
            }
            catch (BusinessException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        [HttpPost("verify-otp")]
        public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpDto dto)
        {
            try
            {
                var result = await forgotPasswordService.VerifyOtpAsync(dto);
                return Ok(result);
            }
            catch (BusinessException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("reset")]
        public async Task<IActionResult> Reset([FromBody] ResetPasswordDto dto)
        {
            try
            {
                var message = await forgotPasswordService.ResetPasswordAsync(dto);
                return Ok(new { message });
            }
            catch (BusinessException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}