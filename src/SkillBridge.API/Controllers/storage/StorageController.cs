using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Interfaces.Storage;

namespace SkillBridge.API.Controllers.storage;

[ApiController]
[Route("api/storage")]
public class StorageController : ControllerBase
{
    private static readonly string[] AllowedPublicPrefixes = new[]
    {
        "avatars/",
        "jobs/",
        "chat/"
    };

    private readonly IStorageService _storageService;
    private readonly ILogger<StorageController> _logger;

    public StorageController(IStorageService storageService, ILogger<StorageController> logger)
    {
        _storageService = storageService;
        _logger = logger;
    }

    [HttpGet("file")]
    [AllowAnonymous]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetFile([FromQuery] string key, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            return BadRequest(new { message = "Thiếu tham số key." });
        }

        // Chuẩn hóa và chống tấn công Path Traversal
        var normalizedKey = key.Trim().Replace('\\', '/').TrimStart('/');
        if (normalizedKey.Contains("..") || normalizedKey.Contains(':'))
        {
            return BadRequest(new { message = "Khóa tệp tin không hợp lệ." });
        }

        // Chỉ cho phép tải các tệp tin thuộc danh mục công khai (ảnh đại diện, tài liệu công việc)
        var isAllowed = AllowedPublicPrefixes.Any(p => normalizedKey.StartsWith(p, StringComparison.OrdinalIgnoreCase));
        if (!isAllowed)
        {
            _logger.LogWarning("Cảnh báo bảo mật: Phát hiện yêu cầu truy cập tệp tin riêng tư {Key} qua StorageController công khai.", normalizedKey);
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                message = "Không có quyền truy cập tệp tin này qua endpoint công khai. Vui lòng sử dụng endpoint nghiệp vụ tương ứng."
            });
        }

        var result = await _storageService.DownloadFileAsync(normalizedKey, cancellationToken);
        if (result == null)
        {
            if (normalizedKey.StartsWith("avatars/", StringComparison.OrdinalIgnoreCase))
            {
                // Fallback SVG avatar vector khi file avatar chưa có trên máy local để không gây lỗi 404 console
                const string fallbackSvg = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><rect width=\"100\" height=\"100\" rx=\"24\" fill=\"#6366f1\"/><circle cx=\"50\" cy=\"42\" r=\"20\" fill=\"#ffffff\" opacity=\"0.9\"/><path d=\"M22 88 c0 -18 14 -28 28 -28 s28 10 28 28 z\" fill=\"#ffffff\" opacity=\"0.9\"/></svg>";
                return Content(fallbackSvg, "image/svg+xml");
            }
            return NotFound(new { message = "Không tìm thấy file trên hệ thống lưu trữ." });
        }

        return File(result.Value.Stream, result.Value.ContentType);
    }
}
