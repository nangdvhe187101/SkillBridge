using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs;
using SkillBridge.Application.Interfaces.Email;

namespace SkillBridge.API.Controllers
{
    [ApiController]
    [Route("api/auth")]
    [EnableRateLimiting("AuthPolicy")]
    public class ResendVerificationController : ControllerBase
    {
        private readonly IResendVerificationService resendVerificationService;
        public ResendVerificationController(IResendVerificationService _resendVerificationService)
        {
            resendVerificationService = _resendVerificationService;
        }
        [HttpPost("resend-verification")]
        public async Task<IActionResult> Resend([FromBody] ResendVerificationDto dto)
        {
            try
            {
                var message = await resendVerificationService.ResendAsync(dto.Email);
                return Ok(new { message });
            }
            catch (BusinessException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}