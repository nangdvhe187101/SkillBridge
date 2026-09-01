using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.API.Common;
using SkillBridge.Application.DTOs.Applications;
using SkillBridge.Application.Interfaces.Applications;

namespace SkillBridge.API.Controllers.applications;

[ApiController]
[Route("api/cv-files")]
[Authorize]
public class CvController : ControllerBase
{
    private readonly ICvService _cvService;

    public CvController(ICvService cvService)
    {
        _cvService = cvService;
    }

    [HttpGet]
    [Authorize(Policy = "RequireStudentRole")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetMyCvFiles()
    {
        var studentId = User.GetRequiredUserId();
        var list = await _cvService.GetStudentCvFilesAsync(studentId);
        return Ok(list);
    }

    [HttpPost]
    [Authorize(Policy = "RequireStudentRole")]
    [EnableRateLimiting("UploadPolicy")]
    public async Task<IActionResult> UploadCv([FromBody] UploadCvRequest request)
    {
        var studentId = User.GetRequiredUserId();
        var result = await _cvService.UploadCvAsync(studentId, request);
        return Ok(result);
    }

    [HttpPost("upload")]
    [Authorize(Policy = "RequireStudentRole")]
    [Consumes("multipart/form-data")]
    [EnableRateLimiting("UploadPolicy")]
    public async Task<IActionResult> UploadCvFile(
        [FromForm] IFormFile file,
        [FromForm] string? label,
        [FromForm] int? categoryId)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "Vui lòng chọn file CV để tải lên." });
        }

        var studentId = User.GetRequiredUserId();
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
    [Authorize(Policy = "RequireStudentRole")]
    [EnableRateLimiting("ResourceCreationPolicy")]
    public async Task<IActionResult> DeleteCv(int id)
    {
        var studentId = User.GetRequiredUserId();
        await _cvService.DeleteCvAsync(studentId, id);
        return Ok(new { message = "Đã xóa CV thành công." });
    }

    [HttpGet("{id:int}/download")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> DownloadCv(int id)
    {
        var userId = User.GetRequiredUserId();
        var (stream, contentType, fileName) = await _cvService.GetCvFileStreamAsync(userId, id);
        return File(stream, contentType, fileName);
    }
}
