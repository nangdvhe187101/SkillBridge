using System.Net;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace SkillBridge.Infrastructure.Services.Security;

public class BotTrapMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IMemoryCache _cache;
    private readonly ILogger<BotTrapMiddleware> _logger;

    private static readonly HashSet<string> TrapPaths = new(StringComparer.OrdinalIgnoreCase)
    {
        "/.env",
        "/.env.local",
        "/.env.production",
        "/.git/config",
        "/wp-login.php",
        "/wp-admin",
        "/phpmyadmin",
        "/actuator/health",
        "/api/.env"
    };

    public BotTrapMiddleware(RequestDelegate next, IMemoryCache cache, ILogger<BotTrapMiddleware> logger)
    {
        _next = next;
        _cache = cache;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var clientIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var cacheKey = $"banned_ip_{clientIp}";

        if (_cache.TryGetValue(cacheKey, out string? _))
        {
            context.Response.StatusCode = (int)HttpStatusCode.Forbidden;
            await context.Response.WriteAsync("Access denied by automated security policy.");
            return;
        }

        var path = context.Request.Path.Value?.ToLowerInvariant() ?? string.Empty;

        if (TrapPaths.Contains(path) || TrapPaths.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase)))
        {
            _logger.LogWarning("[BOT-TRAP] Phát hiện Scanner/Bot quét lỗ hổng từ IP {ClientIp} vào: {Path}. Khóa IP 24 giờ.", clientIp, path);
            _cache.Set(cacheKey, "Vulnerability scanner trap triggered", TimeSpan.FromHours(24));

            context.Response.StatusCode = (int)HttpStatusCode.NotFound;
            await context.Response.WriteAsync("Resource not found.");
            return;
        }

        await _next(context);
    }
}
