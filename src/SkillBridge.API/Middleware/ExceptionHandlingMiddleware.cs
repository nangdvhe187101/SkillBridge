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
                logger.LogWarning("Business exception tại {Path}: {Message}", context.Request.Path, ex.Message);
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