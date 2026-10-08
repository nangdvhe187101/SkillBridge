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
        /// Lấy danh sách các trường đại học / cao đẳng đang hoạt động
        /// </summary>
        [HttpGet("schools")]
        public async Task<IActionResult> GetSchools()
        {
            var schools = await _studentVerificationService.GetSchoolsAsync();
            return Ok(schools);
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

        /// <summary>
        /// Quét OCR ảnh thẻ sinh viên tự động trích xuất thông tin (MSSV, Họ tên, Trường, Niên khóa)
        /// </summary>
        [HttpPost("{id}/ocr")]
        public async Task<IActionResult> RunOcr(int id, System.Threading.CancellationToken ct)
        {
            try
            {
                var ocrResult = await _studentVerificationService.PerformOcrAsync(id, ct);
                return Ok(ocrResult);
            }
            catch (BusinessException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
