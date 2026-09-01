using System;
using System.Security.Claims;

namespace SkillBridge.API.Common;

public static class ClaimsPrincipalExtensions
{
    public static int GetRequiredUserId(this ClaimsPrincipal principal)
    {
        var idClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(idClaim) || !int.TryParse(idClaim, out var userId))
        {
            throw new UnauthorizedAccessException("Không xác định được danh tính người dùng hoặc phiên đăng nhập không hợp lệ.");
        }
        return userId;
    }

    public static int? GetCurrentUserId(this ClaimsPrincipal principal)
    {
        var idClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!string.IsNullOrEmpty(idClaim) && int.TryParse(idClaim, out var userId))
        {
            return userId;
        }
        return null;
    }
}
