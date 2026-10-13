namespace SkillBridge.Application.Common;

/// <summary>
/// Claim đánh dấu token quản trị đã vượt qua xác thực 2 bước tại cổng Admin.
/// Chỉ AdminAuthController phát hành token mang claim này; token từ đăng nhập phía người dùng
/// (mật khẩu, Google, refresh) không có claim nên không thể gọi API quản trị.
/// </summary>
public static class AdminAuthClaims
{
    public const string MfaVerified = "admin_mfa";
    public const string MfaVerifiedValue = "true";
    public const string AdminRoleType = "admin";
}
