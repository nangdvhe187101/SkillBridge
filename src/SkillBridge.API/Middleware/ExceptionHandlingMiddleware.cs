using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using SkillBridge.Application.Common;

namespace SkillBridge.API.Middleware
{
    public class ExceptionHandlingMiddleware
    {
        private readonly RequestDelegate next;
        private readonly ILogger<ExceptionHandlingMiddleware> logger;

        public ExceptionHandlingMiddleware(RequestDelegate _next, ILogger<ExceptionHandlingMiddleware> _logger)
        {
            next = _next;
            logger = _logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await next(context);
            }
            catch (BusinessException ex)
            {
                logger.LogWarning(ex, "Business exception tại {Path}: {Message}", context.Request.Path, ex.Message);
                context.Response.ContentType = "application/json";
                context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                var payload = JsonSerializer.Serialize(new { message = ex.Message });
                await context.Response.WriteAsync(payload);
            }
            catch (UnauthorizedAccessException ex)
            {
                logger.LogWarning(ex, "Unauthorized access tại {Path}: {Message}", context.Request.Path, ex.Message);
                context.Response.ContentType = "application/json";
                context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
                var payload = JsonSerializer.Serialize(new { message = ex.Message });
                await context.Response.WriteAsync(payload);
            }
            catch (KeyNotFoundException ex)
            {
                logger.LogWarning(ex, "Resource not found tại {Path}: {Message}", context.Request.Path, ex.Message);
                context.Response.ContentType = "application/json";
                context.Response.StatusCode = (int)HttpStatusCode.NotFound;
                var payload = JsonSerializer.Serialize(new { message = ex.Message });
                await context.Response.WriteAsync(payload);
            }
            catch (Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException ex)
            {
                logger.LogWarning(ex, "Concurrency conflict tại {Path}: {Message}", context.Request.Path, ex.Message);
                context.Response.ContentType = "application/json";
                context.Response.StatusCode = (int)HttpStatusCode.Conflict;
                var payload = JsonSerializer.Serialize(new { message = "Dữ liệu đã bị thay đổi bởi thao tác khác. Vui lòng tải lại trang và thử lại." });
                await context.Response.WriteAsync(payload);
            }
            catch (ArgumentException ex)
            {
                logger.LogWarning(ex, "Argument validation error tại {Path}: {Message}", context.Request.Path, ex.Message);
                context.Response.ContentType = "application/json";
                context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                var payload = JsonSerializer.Serialize(new { message = ex.Message });
                await context.Response.WriteAsync(payload);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Lỗi chưa được xử lý {Path}", context.Request.Path);
                context.Response.ContentType = "application/json";
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
                var payload = JsonSerializer.Serialize(new { message = "Đã có lỗi xảy ra, vui lòng thử lại sau" });
                await context.Response.WriteAsync(payload);
            }
        }
    }
}