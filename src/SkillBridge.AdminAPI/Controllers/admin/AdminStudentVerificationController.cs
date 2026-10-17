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
        private readonly Microsoft.Extensions.Logging.ILogger<AdminStudentVerificationController> _logger;

        public AdminStudentVerificationController(
            IStudentVerificationService studentVerificationService,
            Microsoft.Extensions.Logging.ILogger<AdminStudentVerificationController> logger)
        {
            _studentVerificationService = studentVerificationService;
            _logger = logger;
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
        /// Lấy hồ sơ xác minh thẻ sinh viên gần nhất của một user cụ thể (dùng cho trang Chi tiết sinh viên).
        /// Trả về null nếu sinh viên chưa từng gửi yêu cầu xác minh nào.
        /// </summary>
        [HttpGet("user/{userId:int}")]
        public async Task<IActionResult> GetByUser(int userId)
        {
            var result = await _studentVerificationService.GetLatestSubmittedVerificationAsync(userId);
            return Ok(result);
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
            catch (Exception ex)
            {
                var errorDetail = ex.InnerException?.Message ?? ex.Message;
                _logger.LogError(ex, "Lỗi hệ thống khi xét duyệt hồ sơ thẻ sinh viên ID {RequestId}: {Message}", id, errorDetail);
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Lỗi hệ thống khi xét duyệt hồ sơ: " + errorDetail });
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
            catch (Exception ex)
            {
                var errorDetail = ex.InnerException?.Message ?? ex.Message;
                _logger.LogError(ex, "Lỗi hệ thống khi thực hiện OCR hồ sơ thẻ sinh viên ID {RequestId}: {Message}", id, errorDetail);
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Lỗi hệ thống khi thực hiện OCR: " + errorDetail });
            }
        }
    }
}
