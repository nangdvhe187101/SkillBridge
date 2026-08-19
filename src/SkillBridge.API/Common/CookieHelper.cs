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
            response.Cookies.Append(RefreshCookieName, refreshToken, new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Strict,
                Expires = DateTimeOffset.UtcNow.AddDays(7),
                Path = "/api/auth"
            });
        }

        public static void ClearRefreshTokenCookie(this HttpResponse response)
        {
            response.Cookies.Delete(RefreshCookieName, new CookieOptions { Path = "/api/auth" });
        }
    }
}