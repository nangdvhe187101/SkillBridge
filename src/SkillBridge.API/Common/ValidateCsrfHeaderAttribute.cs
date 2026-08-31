using System;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace SkillBridge.API.Common
{
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
    public class ValidateCsrfHeaderAttribute : ActionFilterAttribute
    {
        public override void OnActionExecuting(ActionExecutingContext context)
        {
            var request = context.HttpContext.Request;

            // Chấp nhận X-Requested-With (chuẩn XMLHttpRequest/Fetch) hoặc Custom Client Header
            if (!request.Headers.ContainsKey("X-Requested-With") &&
                !request.Headers.ContainsKey("X-SkillBridge-Client"))
            {
                context.Result = new ObjectResult(new { message = "Yêu cầu không hợp lệ (Missing anti-CSRF header)." })
                {
                    StatusCode = StatusCodes.Status403Forbidden
                };
            }
        }
    }
}
