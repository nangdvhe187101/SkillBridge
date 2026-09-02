using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.Application.Interfaces.Storage;

namespace SkillBridge.API.Controllers.storage;

[ApiController]
[Route("api/storage")]
public class StorageController : ControllerBase
{
    private readonly IStorageService _storageService;

    public StorageController(IStorageService storageService)
    {
        _storageService = storageService;
    }

    [HttpGet("file")]
    [AllowAnonymous]
    [EnableRateLimiting("GeneralApiPolicy")]
    [ResponseCache(Duration = 86400, Location = ResponseCacheLocation.Any)]
    public async Task<IActionResult> GetFile([FromQuery] string key, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            return BadRequest(new { message = "Thiếu tham số key." });
        }

        var result = await _storageService.DownloadFileAsync(key, cancellationToken);
        if (result == null)
        {
            return NotFound(new { message = "Không tìm thấy file trên hệ thống lưu trữ." });
        }

        return File(result.Value.Stream, result.Value.ContentType);
    }
}
