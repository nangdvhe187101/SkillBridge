using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkillBridge.API.Common;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs;
using SkillBridge.Application.Interfaces;

namespace SkillBridge.API.Controllers.student
{
    [ApiController]
    [Route("api/student/verification")]
    [Authorize]
    public class StudentVerificationController : ControllerBase
    {
        private readonly IStudentVerificationService _studentVerificationService;
        private readonly SkillBridge.Application.Interfaces.Storage.IStorageService _storageService;

        public StudentVerificationController(
            IStudentVerificationService studentVerificationService,
            SkillBridge.Application.Interfaces.Storage.IStorageService storageService)
        {
            _studentVerificationService = studentVerificationService;
            _storageService = storageService;
        }

        /// <summary>
        /// Tải lên ảnh thẻ sinh viên (mặt trước hoặc mặt sau)
        /// </summary>
        [HttpPost("upload-card")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadCard(Microsoft.AspNetCore.Http.IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "Vui lòng chọn file hình ảnh thẻ sinh viên để tải lên." });
            }

            var allowedMime = new[] { "image/jpeg", "image/png", "image/webp", "image/jpg" };
            if (!System.Linq.Enumerable.Contains(allowedMime, file.ContentType.ToLowerInvariant()))
            {
                return BadRequest(new { message = "Chỉ chấp nhận file hình ảnh định dạng JPG, PNG hoặc WEBP. Không chấp nhận file PDF." });
            }

            if (file.Length > 10 * 1024 * 1024)
            {
                return BadRequest(new { message = "Kích thước ảnh không được vượt quá 10MB." });
            }

            var userId = User.GetRequiredUserId();
            using var stream = file.OpenReadStream();

            // Tính SHA256 hash của file ảnh
            using var sha256 = System.Security.Cryptography.SHA256.Create();
            var hashBytes = await sha256.ComputeHashAsync(stream);
            var fileSha256 = BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();

            stream.Position = 0;
            var folder = $"identity_documents/{userId}";
            var uploadResult = await _storageService.UploadStreamAsync(stream, file.FileName, file.ContentType, folder);
            var publicUrl = _storageService.GetPublicUrl(uploadResult.FileKey);

            return Ok(new
            {
                fileKey = uploadResult.FileKey,
                fileUrl = publicUrl,
                fileSha256 = fileSha256
            });
        }

        /// <summary>
        /// Lấy danh sách các trường đại học hợp lệ trong hệ thống
        /// </summary>
        [HttpGet("schools")]
        [AllowAnonymous]
        public async Task<IActionResult> GetSchools()
        {
            var schools = await _studentVerificationService.GetSchoolsAsync();
            return Ok(schools);
        }

        /// <summary>
        /// Nộp hồ sơ xác minh thẻ sinh viên
        /// </summary>
        [HttpPost("submit")]
        public async Task<IActionResult> SubmitVerification([FromBody] SubmitStudentVerificationDto dto)
        {
            var userId = User.GetRequiredUserId();
            try
            {
                var result = await _studentVerificationService.SubmitVerificationAsync(userId, dto);
                return Ok(result);
            }
            catch (BusinessException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Xem trạng thái hồ sơ xác minh thẻ sinh viên mới nhất
        /// </summary>
        [HttpGet("status")]
        public async Task<IActionResult> GetStatus()
        {
            var userId = User.GetRequiredUserId();
            var result = await _studentVerificationService.GetLatestVerificationAsync(userId);
            if (result == null)
            {
                return Ok(new { status = "unverified", message = "Bạn chưa nộp hồ sơ xác minh thẻ sinh viên." });
            }
            return Ok(result);
        }
    }
}
