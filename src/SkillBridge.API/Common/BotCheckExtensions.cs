using Microsoft.AspNetCore.Http;
using SkillBridge.Infrastructure.Services.Security;

namespace SkillBridge.API.Common;

public static class BotCheckExtensions
{
    public const string FailureMessage = "Xác minh bảo mật thất bại. Vui lòng thử lại.";

    /// <summary>
    /// Chặn request từ bot: field honeypot ẩn phải rỗng và token Turnstile phải hợp lệ.
    /// </summary>
    public static async Task<bool> PassesBotCheckAsync(
        this ITurnstileService turnstileService,
        HttpContext context,
        string? honeypot,
        string? turnstileToken)
    {
        // Honeypot: field ẩn mà người dùng thật không bao giờ điền
        if (!string.IsNullOrWhiteSpace(honeypot))
        {
            return false;
        }

        var forwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        var remoteIp = forwardedFor?.Split(',')[0].Trim()
            ?? context.Connection.RemoteIpAddress?.ToString();

        return await turnstileService.VerifyTokenAsync(turnstileToken, remoteIp, context.RequestAborted);
    }
}
