using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs;
using SkillBridge.Application.Interfaces;
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
    private readonly ILogger<AdminAuthController> _logger;

    public AdminAuthController(
        ILoginService loginService,
        IUserRepository userRepository,
        IAuthTokenRepository authTokenRepository,
        ILogger<AdminAuthController> logger)
    {
        _loginService = loginService;
        _userRepository = userRepository;
        _authTokenRepository = authTokenRepository;
        _logger = logger;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        try
        {
            var (result, _) = await _loginService.LoginAsync(dto);

            // Kiểm tra quyền: chỉ tài khoản có Role.Type == "admin" mới được phép đăng nhập vào Admin Portal
            var user = await _userRepository.GetByEmailWithRoleAsync(dto.Email?.Trim().ToLowerInvariant() ?? string.Empty);
            if (user == null || user.Role == null || !string.Equals(user.Role.Type, "admin", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Đăng nhập thất bại: Tài khoản {Email} (UserId: {UserId}) không phải quản trị viên cố gắng đăng nhập vào AdminAPI.", dto.Email, result.UserId);
                // Thu hồi refresh token vừa được tạo bởi LoginService
                await _authTokenRepository.InvalidateAllActiveTokensAsync(result.UserId, "refresh");
                return Unauthorized(new { message = "Email hoặc mật khẩu không đúng" });
            }

            _logger.LogInformation("Admin {Email} (UserId: {UserId}) đăng nhập thành công vào Admin Portal.", user.Email, user.Id);

            return Ok(new
            {
                accessToken = result.Token,
                token = result.Token,
                userId = result.UserId,
                fullName = result.FullName,
                email = result.Email,
                roleCode = result.RoleCode,
                avatarUrl = result.AvatarUrl
            });
        }
        catch (BusinessException ex)
        {
            _logger.LogWarning("Admin login failed for {Email}: {Message}", dto.Email, ex.Message);
            return Unauthorized(new { message = "Email hoặc mật khẩu không đúng" });
        }
    }
}
