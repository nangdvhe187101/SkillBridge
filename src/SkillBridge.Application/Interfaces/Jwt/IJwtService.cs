using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SkillBridge.Application.Interfaces
{
    public interface IJwtService
    {
        string GenerateToken(int userId, string email, string roleCode, int tokenVersion, string? roleType = null);

        /// <summary>
        /// Token quản trị: chỉ phát hành sau khi admin vượt qua mật khẩu + 2FA tại cổng Admin
        /// (mang claim admin_mfa mà API quản trị bắt buộc).
        /// </summary>
        string GenerateAdminToken(int userId, string email, string roleCode, int tokenVersion);
        string GenerateRefreshTokenString();
    }
}