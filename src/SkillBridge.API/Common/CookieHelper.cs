using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SkillBridge.API.Common
{
    public static class CookieHelper
    {
        public const string RefreshCookieName = "refresh_token";

        public static void SetRefreshTokenCookie(this HttpResponse response, string refreshToken)
        {
            var isHttps = response.HttpContext.Request.IsHttps;
            response.Cookies.Append(RefreshCookieName, refreshToken, new CookieOptions
            {
                HttpOnly = true,
                Secure = isHttps,
                SameSite = isHttps ? SameSiteMode.None : SameSiteMode.Lax,
                Expires = DateTimeOffset.UtcNow.AddDays(7),
                Path = "/api/auth"
            });
        }

        public static void ClearRefreshTokenCookie(this HttpResponse response)
        {
            var isHttps = response.HttpContext.Request.IsHttps;
            response.Cookies.Delete(RefreshCookieName, new CookieOptions
            {
                HttpOnly = true,
                Secure = isHttps,
                SameSite = isHttps ? SameSiteMode.None : SameSiteMode.Lax,
                Path = "/api/auth"
            });
        }
    }
}