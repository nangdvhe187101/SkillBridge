using System;
using System.Threading;
using System.Threading.Tasks;

namespace SkillBridge.Application.Interfaces.Security;

/// <summary>
/// Dịch vụ bảo mật xác thực hai yếu tố (2FA TOTP - RFC 6238) dành cho quản trị viên
/// </summary>
public interface ITotpService
{
    /// <summary>
    /// @ears .sdd/features/admin-management/SPEC.md#REQ-SEC-01
    /// Sinh khoá bí mật Base32 ngẫu nhiên (chuẩn 32 ký tự Base32)
    /// </summary>
    string GenerateSecretKey();

    /// <summary>
    /// @ears .sdd/features/admin-management/SPEC.md#REQ-SEC-02
    /// Tạo URI định dạng otpauth:// để hiển thị mã QR trong Google Authenticator / Microsoft Authenticator
    /// </summary>
    string GenerateQrCodeUri(string email, string secretKey, string issuer = "SkillBridge");

    /// <summary>
    /// @ears .sdd/features/admin-management/SPEC.md#REQ-SEC-03
    /// Xác thực mã TOTP 6 số dựa trên khoá bí mật (chấp nhận dung sai lệch ±1 chu kỳ 30 giây)
    /// </summary>
    bool ValidateCode(string secretKey, string code);

    /// <summary>
    /// Kiểm tra trạng thái kích hoạt 2FA của tài khoản quản trị
    /// </summary>
    Task<TotpAdminStatusDto> GetAdmin2FaStatusAsync(int adminUserId, CancellationToken ct = default);

    /// <summary>
    /// Bắt đầu thiết lập 2FA: sinh secret key mới và lưu tạm trong phiên chờ xác nhận
    /// </summary>
    Task<TotpSetupResponseDto> Setup2FaAsync(int adminUserId, string email, CancellationToken ct = default);

    /// <summary>
    /// Xác nhận mã OTP đầu tiên để chính thức kích hoạt 2FA cho tài khoản
    /// </summary>
    Task<bool> Confirm2FaSetupAsync(int adminUserId, string code, string? secretKeyFromClient = null, CancellationToken ct = default);

    /// <summary>
    /// Hủy kích hoạt 2FA cho tài khoản quản trị viên
    /// </summary>
    Task<bool> Disable2FaAsync(int adminUserId, CancellationToken ct = default);

    /// <summary>
    /// Lấy khoá bí mật hiện tại của Admin (được mã hoá an toàn) để xác thực khi đăng nhập
    /// </summary>
    Task<string?> GetAdminSecretKeyAsync(int adminUserId, CancellationToken ct = default);
}

public class TotpAdminStatusDto
{
    public bool IsTwoFactorEnabled { get; set; }
    public DateTime? EnabledAt { get; set; }
}

public class TotpSetupResponseDto
{
    public string SecretKey { get; set; } = string.Empty;
    public string QrCodeUri { get; set; } = string.Empty;
    public string ManualEntryKey { get; set; } = string.Empty;
}

public class Verify2FaRequestDto
{
    public string TempToken { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
}

public class Confirm2FaSetupRequestDto
{
    public string Code { get; set; } = string.Empty;
    public string? SecretKey { get; set; }
}
