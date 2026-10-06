using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkillBridge.AdminAPI.Common;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs;
using SkillBridge.Application.Interfaces;

namespace SkillBridge.AdminAPI.Controllers.admin
{
    [ApiController]
    [Route("api/admin/student-verifications")]
    [Authorize(Policy = "RequireAdminRole")]
    public class AdminStudentVerificationController : ControllerBase
    {
        private readonly IStudentVerificationService _studentVerificationService;

        public AdminStudentVerificationController(IStudentVerificationService studentVerificationService)
        {
            _studentVerificationService = studentVerificationService;
        }

        /// <summary>
        /// Lấy danh sách hồ sơ xác minh thẻ sinh viên đang chờ duyệt
        /// </summary>
        [HttpGet("pending")]
        public async Task<IActionResult> GetPending()
        {
            var results = await _studentVerificationService.GetPendingVerificationsForAdminAsync();
            return Ok(results);
        }

        /// <summary>
        /// Xét duyệt hồ sơ thẻ sinh viên (approve, need_more_info, reject)
        /// </summary>
        [HttpPost("{id}/review")]
        public async Task<IActionResult> Review(int id, [FromBody] AdminReviewVerificationDto dto)
        {
            var adminId = User.GetRequiredUserId();
            try
            {
                var result = await _studentVerificationService.ReviewVerificationAsync(id, adminId, dto);
                return Ok(result);
            }
            catch (BusinessException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
