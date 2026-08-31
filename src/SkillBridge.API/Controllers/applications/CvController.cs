using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkillBridge.Application.DTOs.Applications;
using SkillBridge.Application.Interfaces.Applications;

namespace SkillBridge.API.Controllers.applications;

[ApiController]
[Route("api/cv-files")]
[Authorize(Policy = "RequireStudentRole")]
public class CvController : ControllerBase
{
    private readonly ICvService _cvService;

    public CvController(ICvService cvService)
    {
        _cvService = cvService;
    }

    [HttpGet]
    public async Task<IActionResult> GetMyCvFiles()
    {
        var studentId = GetRequiredUserId();
        var list = await _cvService.GetStudentCvFilesAsync(studentId);
        return Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> UploadCv([FromBody] UploadCvRequest request)
    {
        var studentId = GetRequiredUserId();
        var result = await _cvService.UploadCvAsync(studentId, request);
        return Ok(result);
    }

    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadCvFile(
        [FromForm] Microsoft.AspNetCore.Http.IFormFile file,
        [FromForm] string? label,
        [FromForm] int? categoryId)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "Vui lòng chọn file CV để tải lên." });
        }

        var studentId = GetRequiredUserId();
        using var stream = file.OpenReadStream();
        var result = await _cvService.UploadCvBinaryAsync(
            studentId,
            stream,
            file.FileName,
            file.ContentType,
            label,
            categoryId);

        return Ok(result);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteCv(int id)
    {
        var studentId = GetRequiredUserId();
        await _cvService.DeleteCvAsync(studentId, id);
        return Ok(new { message = "Đã xóa CV thành công." });
    }

    private int GetRequiredUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(idClaim) || !int.TryParse(idClaim, out var userId))
        {
            throw new UnauthorizedAccessException("Không xác định được danh tính người dùng.");
        }
        return userId;
    }
}
