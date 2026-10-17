using System.ComponentModel.DataAnnotations;
using System.Dynamic;

namespace SkillBridge.Application.DTOs;

public static class RoleCode
{
    public const string Student = "student";
    public const string Employer = "employer";
}
public class RegisterDto
{
    [Required(ErrorMessage = "Vui lòng nhập họ tên")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Họ tên phải từ 2-100 ký tự")]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Vui lòng nhập email")]
    [EmailAddress(ErrorMessage = "Email không hợp lệ")]
    [StringLength(200, ErrorMessage = "Email không được quá 200 ký tự")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Vui lòng nhập mật khẩu")]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "Mật khẩu phải từ 8-100 ký tự")]
    public string Password { get; set; } = string.Empty;

    [Phone(ErrorMessage = "Số điện thoại không hợp lệ")]
    [StringLength(20, ErrorMessage = "Số điện thoại không được quá 20 ký tự")]
    public string? PhoneNumber { get; set; }

    [Required(ErrorMessage = "Vui lòng chọn vai trò")]
    [RegularExpression("^(student|employer)$", ErrorMessage = "Vai trò không hợp lệ")]
    public string RoleCode { get; set; } = string.Empty;
}

public class LoginDto
{
    [Required(ErrorMessage = "Vui lòng nhập email")]
    [EmailAddress(ErrorMessage = "Email không hợp lệ")]
    [StringLength(200, ErrorMessage = "Email không được quá 200 ký tự")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Vui lòng nhập mật khẩu")]
    [StringLength(100, MinimumLength = 1, ErrorMessage = "Mật khẩu không được quá 100 ký tự")]
    public string Password { get; set; } = string.Empty;
}

public class GoogleLoginDto
{
    [Required(ErrorMessage = "Vui lòng cung cấp Google ID Token")]
    [StringLength(5000, ErrorMessage = "Token không hợp lệ")]
    public string IdToken { get; set; } = string.Empty;

    [Required]
    [RegularExpression("^(student|employer)$", ErrorMessage = "Vai trò không hợp lệ")]
    public string RoleCode { get; set; } = "student";

    [Required]
    [RegularExpression("^(login|register)$", ErrorMessage = "Mode không hợp lệ")]
    public string Mode { get; set; } = "login"; // "login" | "register"
}

public class AuthResponseDto
{
    public string Token { get; set; } = string.Empty;
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string RoleCode { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public bool HasPassword { get; set; } = true;
}

public class RefreshTokenDto
{
    public string RefreshToken { get; set; } = string.Empty;
}

public class RegisterResultDto
{
    public int UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public class VerifyEmailDto
{
    [Required(ErrorMessage = "Token xác thực không được để trống")]
    [StringLength(500, ErrorMessage = "Token không hợp lệ")]
    public string Token { get; set; } = string.Empty;
}

public class ResendVerificationDto
{
    [Required(ErrorMessage = "Vui lòng nhập email")]
    [EmailAddress(ErrorMessage = "Email không hợp lệ")]
    [StringLength(200, ErrorMessage = "Email không được quá 200 ký tự")]
    public string Email { get; set; } = string.Empty;
}


public class ForgotPasswordRequestDto
{
    [Required(ErrorMessage = "Vui lòng nhập email")]
    [EmailAddress(ErrorMessage = "Email không hợp lệ")]
    [StringLength(200, ErrorMessage = "Email không được quá 200 ký tự")]
    public string Email { get; set; } = string.Empty;
}

public class VerifyOtpDto
{
    [Required(ErrorMessage = "Vui lòng nhập email")]
    [EmailAddress(ErrorMessage = "Email không hợp lệ")]
    [StringLength(200, ErrorMessage = "Email không được quá 200 ký tự")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Vui lòng nhập mã OTP")]
    [StringLength(10, MinimumLength = 4, ErrorMessage = "Mã OTP phải từ 4-10 ký tự")]
    public string Otp { get; set; } = string.Empty;
}

public class VerifyOtpResultDto
{
    public string ResetToken { get; set; } = string.Empty;
}

public class ResetPasswordDto
{
    [Required(ErrorMessage = "Token reset không được để trống")]
    [StringLength(500, ErrorMessage = "Token không hợp lệ")]
    public string ResetToken { get; set; } = string.Empty;

    [Required(ErrorMessage = "Vui lòng nhập mật khẩu mới")]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "Mật khẩu phải từ 8-100 ký tự")]
    public string NewPassword { get; set; } = string.Empty;
}

public class ChangePasswordDto
{
    [StringLength(100, ErrorMessage = "Mật khẩu hiện tại không được quá 100 ký tự")]
    public string? CurrentPassword { get; set; }

    [Required(ErrorMessage = "Vui lòng nhập mật khẩu mới")]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "Mật khẩu mới phải từ 8-100 ký tự")]
    public string NewPassword { get; set; } = string.Empty;
}