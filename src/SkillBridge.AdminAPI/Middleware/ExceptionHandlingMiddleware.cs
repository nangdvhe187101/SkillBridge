using System;
using System.Collections.Generic;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;

namespace SkillBridge.AdminAPI.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (BusinessException ex)
        {
            _logger.LogWarning(ex, "Admin Business exception tại {Path}: {Message}", context.Request.Path, ex.Message);
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
            var payload = JsonSerializer.Serialize(new { message = ex.Message });
            await context.Response.WriteAsync(payload);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Admin Unauthorized access tại {Path}: {Message}", context.Request.Path, ex.Message);
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
            var payload = JsonSerializer.Serialize(new { message = ex.Message });
            await context.Response.WriteAsync(payload);
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "Admin Resource not found tại {Path}: {Message}", context.Request.Path, ex.Message);
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = (int)HttpStatusCode.NotFound;
            var payload = JsonSerializer.Serialize(new { message = ex.Message });
            await context.Response.WriteAsync(payload);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Admin Unhandled exception tại {Path}", context.Request.Path);
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
            var payload = JsonSerializer.Serialize(new { message = "Đã có lỗi xảy ra, vui lòng thử lại sau" });
            await context.Response.WriteAsync(payload);
        }
    }
}
