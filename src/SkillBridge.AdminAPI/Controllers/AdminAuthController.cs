using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using SkillBridge.AdminAPI.Common;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs;
using SkillBridge.Application.Interfaces;
using SkillBridge.Application.Interfaces.Security;
using SkillBridge.Infrastructure.Repositories.Interfaces;

namespace SkillBridge.AdminAPI.Controllers;

[ApiController]
[Route("api/admin-auth")]
[EnableRateLimiting("AuthPolicy")]
public class AdminAuthController : ControllerBase
{
    private readonly ILoginService _loginService;
    private readonly IUserRepository _userRepository;
    private readonly IAuthTokenRepository _authTokenRepository;
    private readonly ITotpService _totpService;
    private readonly IJwtService _jwtService;
    private readonly IMemoryCache _memoryCache;
    private readonly ILogger<AdminAuthController> _logger;

    public AdminAuthController(
        ILoginService loginService,
        IUserRepository userRepository,
        IAuthTokenRepository authTokenRepository,
        ITotpService totpService,
        IJwtService jwtService,
        IMemoryCache memoryCache,
        ILogger<AdminAuthController> logger)
    {
        _loginService = loginService;
        _userRepository = userRepository;
        _authTokenRepository = authTokenRepository;
        _totpService = totpService;
        _jwtService = jwtService;
        _memoryCache = memoryCache;
        _logger = logger;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto, CancellationToken ct)
    {
        try
        {
            var (result, _) = await _loginService.LoginAsync(dto);

            // Kiểm tra quyền: chỉ tài khoản có Role.Type == "admin" mới được phép đăng nhập vào Admin Portal
            var user = await _userRepository.GetByEmailWithRoleAsync(dto.Email?.Trim().ToLowerInvariant() ?? string.Empty);
            if (user == null || user.Role == null || !string.Equals(user.Role.Type, "admin", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Đăng nhập thất bại: Tài khoản {Email} (UserId: {UserId}) không phải quản trị viên cố gắng đăng nhập vào AdminAPI.", dto.Email, result.UserId);
                await _authTokenRepository.InvalidateAllActiveTokensAsync(result.UserId, "refresh");
                return Unauthorized(new { message = "Email hoặc mật khẩu không đúng" });
            }

            // Kiểm tra trạng thái 2FA của Admin (Q-001 / BR-SEC-01)
            var twoFactorStatus = await _totpService.GetAdmin2FaStatusAsync(user.Id, ct);
            if (twoFactorStatus.IsTwoFactorEnabled)
            {
                // Tạo Temp Token phiên đăng nhập chờ 2FA (hạn 5 phút)
                var tempToken = $"temp_2fa_{Guid.NewGuid():N}";
                var pendingSession = new AdminPending2FaSession
                {
                    UserId = user.Id,
                    Email = user.Email,
                    FullName = user.FullName,
                    RoleCode = user.Role.Code,
                    RoleType = user.Role.Type,
                    TokenVersion = user.TokenVersion,
                    AvatarUrl = user.AvatarUrl
                };

                _memoryCache.Set(tempToken, pendingSession, TimeSpan.FromMinutes(5));

                _logger.LogInformation("Admin {Email} (UserId: {UserId}) vượt qua bước 1 mật khẩu, yêu cầu xác thực 2FA TOTP.", user.Email, user.Id);

                return Ok(new
                {
                    requiresTwoFactor = true,
                    tempToken,
                    userId = user.Id,
                    email = user.Email,
                    message = "Tài khoản của bạn đã bật xác thực 2 bước. Vui lòng nhập mã 6 số từ ứng dụng Authenticator."
                });
            }

            _logger.LogInformation("Admin {Email} (UserId: {UserId}) đăng nhập thành công vào Admin Portal.", user.Email, user.Id);

            var effectiveRoleCode = user.Role.Code;
            if (string.Equals(effectiveRoleCode, "admin", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(user.Email, "skillbridge.vn@gmail.com", StringComparison.OrdinalIgnoreCase))
            {
                effectiveRoleCode = "business_admin";
            }

            return Ok(new
            {
                requiresTwoFactor = false,
                isTwoFactorEnabled = false,
                accessToken = result.Token,
                token = result.Token,
                userId = result.UserId,
                fullName = result.FullName,
                email = result.Email,
                roleCode = effectiveRoleCode,
                avatarUrl = result.AvatarUrl
            });
        }
        catch (BusinessException ex)
        {
            _logger.LogWarning(ex, "Admin login failed for {Email}: {Message}", dto.Email, ex.Message);
            return Unauthorized(new { message = "Email hoặc mật khẩu không đúng" });
        }
    }

    /// <summary>
    /// Bước 2 đăng nhập: Xác thực mã TOTP 6 số từ Authenticator
    /// </summary>
    [HttpPost("verify-2fa")]
    public async Task<IActionResult> Verify2Fa([FromBody] Verify2FaRequestDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.TempToken) || string.IsNullOrWhiteSpace(dto.Code))
        {
            return BadRequest(new { message = "Thiếu thông tin phiên đăng nhập tạm hoặc mã xác thực 2FA." });
        }

        if (!_memoryCache.TryGetValue(dto.TempToken, out AdminPending2FaSession? session) || session == null)
        {
            return BadRequest(new { message = "Phiên xác thực 2FA đã hết hạn. Vui lòng đăng nhập lại từ đầu." });
        }

        var secretKey = await _totpService.GetAdminSecretKeyAsync(session.UserId, ct);
        if (string.IsNullOrWhiteSpace(secretKey))
        {
            return BadRequest(new { message = "Tài khoản chưa được thiết lập khóa bí mật 2FA." });
        }

        var isValid = _totpService.ValidateCode(secretKey, dto.Code);
        if (!isValid)
        {
            _logger.LogWarning("Admin #{UserId} nhập sai mã 2FA TOTP.", session.UserId);
            return BadRequest(new { message = "Mã xác thực 2FA không chính xác hoặc đã hết hạn. Vui lòng thử lại." });
        }

        // Hủy phiên tạm sau khi dùng thành công
        _memoryCache.Remove(dto.TempToken);

        // Sinh Token JWT chính thức
        var token = _jwtService.GenerateToken(
            session.UserId,
            session.Email,
            session.RoleCode,
            session.TokenVersion,
            session.RoleType);

        _logger.LogInformation("Admin #{UserId} ({Email}) đã vượt qua 2FA TOTP thành công.", session.UserId, session.Email);

        var effectiveRoleCode = session.RoleCode;
        if (string.Equals(effectiveRoleCode, "admin", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(session.Email, "skillbridge.vn@gmail.com", StringComparison.OrdinalIgnoreCase))
        {
            effectiveRoleCode = "business_admin";
        }

        return Ok(new
        {
            requiresTwoFactor = false,
            isTwoFactorEnabled = true,
            accessToken = token,
            token,
            userId = session.UserId,
            fullName = session.FullName,
            email = session.Email,
            roleCode = effectiveRoleCode,
            avatarUrl = session.AvatarUrl
        });
    }

    /// <summary>
    /// Lấy trạng thái 2FA của Admin đang đăng nhập
    /// </summary>
    [HttpGet("2fa/status")]
    [Authorize(Policy = "RequireAdminRole")]
    public async Task<IActionResult> Get2FaStatus(CancellationToken ct)
    {
        var adminUserId = User.GetRequiredUserId();
        var status = await _totpService.GetAdmin2FaStatusAsync(adminUserId, ct);
        return Ok(status);
    }

    /// <summary>
    /// Bắt đầu quy trình thiết lập 2FA: sinh secret key và mã QR
    /// </summary>
    [HttpPost("2fa/setup")]
    [Authorize(Policy = "RequireAdminRole")]
    public async Task<IActionResult> Setup2Fa(CancellationToken ct)
    {
        var adminUserId = User.GetRequiredUserId();
        var user = await _userRepository.GetByIdAsync(adminUserId);
        if (user == null)
        {
            return NotFound(new { message = "Không tìm thấy thông tin tài khoản quản trị." });
        }

        var result = await _totpService.Setup2FaAsync(adminUserId, user.Email, ct);
        return Ok(result);
    }

    /// <summary>
    /// Xác nhận mã OTP đầu tiên để chính thức bật 2FA
    /// </summary>
    [HttpPost("2fa/confirm")]
    [Authorize(Policy = "RequireAdminRole")]
    public async Task<IActionResult> Confirm2Fa([FromBody] Confirm2FaSetupRequestDto dto, CancellationToken ct)
    {
        var adminUserId = User.GetRequiredUserId();
        try
        {
            var success = await _totpService.Confirm2FaSetupAsync(adminUserId, dto.Code, dto.SecretKey, ct);
            return Ok(new { success, message = "Đã kích hoạt xác thực 2 bước (2FA) thành công cho tài khoản." });
        }
        catch (BusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Hủy kích hoạt 2FA
    /// </summary>
    [HttpPost("2fa/disable")]
    [Authorize(Policy = "RequireAdminRole")]
    public async Task<IActionResult> Disable2Fa(CancellationToken ct)
    {
        var adminUserId = User.GetRequiredUserId();
        var success = await _totpService.Disable2FaAsync(adminUserId, ct);
        return Ok(new { success, message = "Đã tắt xác thực 2 bước (2FA)." });
    }

    private class AdminPending2FaSession
    {
        public int UserId { get; set; }
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string RoleCode { get; set; } = string.Empty;
        public string RoleType { get; set; } = string.Empty;
        public int TokenVersion { get; set; }
        public string? AvatarUrl { get; set; }
    }
}
