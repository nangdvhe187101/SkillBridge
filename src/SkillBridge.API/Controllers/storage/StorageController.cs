using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Logging;
using SkillBridge.API.Common;
using SkillBridge.Application.Interfaces.Storage;

namespace SkillBridge.API.Controllers.storage;

[ApiController]
[Route("api/storage")]
[Route("api/api/storage")]
public class StorageController : ControllerBase
{
    private static readonly string[] AllowedPublicPrefixes = new[]
    {
        "avatars/",
        "covers/",
        "portfolio/",
        "jobs/",
        "chat/",
        "identity_documents/"
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

        // Chỉ cho phép tải các tệp tin thuộc danh mục công khai hoặc hồ sơ định danh
        var isAllowed = AllowedPublicPrefixes.Any(p => normalizedKey.StartsWith(p, StringComparison.OrdinalIgnoreCase));
        if (!isAllowed)
        {
            _logger.LogWarning("Cảnh báo bảo mật: Phát hiện yêu cầu truy cập tệp tin riêng tư {Key} qua StorageController công khai.", normalizedKey);
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                message = "Không có quyền truy cập tệp tin này qua endpoint công khai. Vui lòng sử dụng endpoint nghiệp vụ tương ứng."
            });
        }

        // Kiểm soát quyền truy cập tài liệu định danh (Nghị định 13/2023/NĐ-CP & SEC-02)
        if (normalizedKey.StartsWith("identity_documents/", StringComparison.OrdinalIgnoreCase))
        {
            var segments = normalizedKey.Split('/');
            if (segments.Length > 1 && int.TryParse(segments[1], out var targetUserId))
            {
                var currentUserId = User.GetCurrentUserId();
                // Chỉ token quản trị đã qua 2FA (claim admin_mfa) mới được xem giấy tờ KYC của người khác
                var isAdmin = User.HasClaim(SkillBridge.Application.Common.AdminAuthClaims.MfaVerified, SkillBridge.Application.Common.AdminAuthClaims.MfaVerifiedValue) &&
                              (User.IsInRole("admin") || User.IsInRole("super_admin") ||
                               User.HasClaim("role_type", SkillBridge.Application.Common.AdminAuthClaims.AdminRoleType));

                var isOwner = currentUserId.HasValue && currentUserId.Value == targetUserId;

                if (!isOwner && !isAdmin)
                {
                    // Cho phép môi trường Development kiểm thử nội bộ nếu chưa gắn token
                    var isDev = string.Equals(Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"), "Development", StringComparison.OrdinalIgnoreCase);
                    if (!isDev)
                    {
                        _logger.LogWarning("Cảnh báo bảo mật SEC-02: Truy cập trái phép vào giấy tờ định danh của User {TargetUserId} từ Caller {CurrentUserId}.", targetUserId, currentUserId);
                        return StatusCode(StatusCodes.Status403Forbidden, new
                        {
                            message = "Bạn không có quyền truy cập giấy tờ định danh của người dùng khác (Nghị định 13/2023/NĐ-CP)."
                        });
                    }
                }
            }
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

            if (normalizedKey.StartsWith("identity_documents/", StringComparison.OrdinalIgnoreCase))
            {
                // Fallback SVG thẻ sinh viên vector minh họa khi file chưa tìm thấy trên môi trường local
                const string fallbackCardSvg = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 400 250\"><defs><linearGradient id=\"cardGrad\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"100%\"><stop offset=\"0%\" stop-color=\"#1e293b\"/><stop offset=\"100%\" stop-color=\"#0f172a\"/></linearGradient></defs><rect width=\"400\" height=\"250\" rx=\"16\" fill=\"url(#cardGrad)\" stroke=\"#334155\" stroke-width=\"2\"/><rect x=\"24\" y=\"28\" width=\"90\" height=\"110\" rx=\"8\" fill=\"#1e293b\" stroke=\"#475569\" stroke-width=\"1.5\"/><circle cx=\"69\" cy=\"70\" r=\"22\" fill=\"#6366f1\" opacity=\"0.8\"/><path d=\"M42 125 c0 -14 11 -22 27 -22 s27 8 27 22 z\" fill=\"#6366f1\" opacity=\"0.8\"/><rect x=\"130\" y=\"38\" width=\"160\" height=\"16\" rx=\"4\" fill=\"#f1f5f9\"/><rect x=\"130\" y=\"66\" width=\"230\" height=\"11\" rx=\"3\" fill=\"#94a3b8\"/><rect x=\"130\" y=\"88\" width=\"180\" height=\"11\" rx=\"3\" fill=\"#94a3b8\"/><rect x=\"130\" y=\"110\" width=\"140\" height=\"11\" rx=\"3\" fill=\"#94a3b8\"/><rect x=\"24\" y=\"165\" width=\"352\" height=\"55\" rx=\"8\" fill=\"rgba(99, 102, 241, 0.12)\" stroke=\"rgba(99, 102, 241, 0.3)\"/><text x=\"200\" y=\"198\" text-anchor=\"middle\" fill=\"#818cf8\" font-size=\"14\" font-weight=\"600\" font-family=\"system-ui, -apple-system, sans-serif\">🎓 THẺ SINH VIÊN ĐÃ TẢI LÊN</text></svg>";
                return Content(fallbackCardSvg, "image/svg+xml");
            }

            return NotFound(new { message = "Không tìm thấy file trên hệ thống lưu trữ." });
        }

        // Tối ưu HTTP Caching: Cho phép trình duyệt lưu cache 30 ngày với asset công khai để tăng tốc độ tải
        if (normalizedKey.StartsWith("avatars/", StringComparison.OrdinalIgnoreCase) ||
            normalizedKey.StartsWith("jobs/", StringComparison.OrdinalIgnoreCase))
        {
            Response.Headers["Cache-Control"] = "public, max-age=2592000, stale-while-revalidate=86400";
        }
        else
        {
            Response.Headers["Cache-Control"] = "private, no-cache, no-store, must-revalidate";
        }

        return File(result.Value.Stream, result.Value.ContentType);
    }
}
