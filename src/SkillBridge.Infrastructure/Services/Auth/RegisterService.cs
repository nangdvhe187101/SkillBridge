using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MySqlConnector;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs;
using SkillBridge.Application.Interfaces;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Repositories.Interfaces;

namespace SkillBridge.Infrastructure.Services.Auth;

public class RegisterService : IRegisterService
{
    private readonly IUserRepository userRepository;
    private readonly IRoleRepository roleRepository;
    private readonly IAuthTokenRepository authTokenRepository;
    private readonly IEmailService emailService;
    private readonly IJwtService jwtService;
    private readonly IConfiguration config;
    private readonly ILogger<RegisterService> logger;

    public RegisterService(
        IUserRepository _userRepository,
        IRoleRepository _roleRepository,
        IAuthTokenRepository _authTokenRepository,
        IEmailService _emailService,
        IJwtService _jwtService,
        IConfiguration _config,
        ILogger<RegisterService> _logger)
    {
        userRepository = _userRepository;
        roleRepository = _roleRepository;
        authTokenRepository = _authTokenRepository;
        emailService = _emailService;
        jwtService = _jwtService;
        config = _config;
        logger = _logger;
    }

    public async Task<RegisterResultDto> RegisterAsync(RegisterDto dto)
    {
        dto.Email = dto.Email?.Trim().ToLowerInvariant() ?? string.Empty;
        dto.FullName = dto.FullName?.Trim() ?? string.Empty;
        dto.PhoneNumber = string.IsNullOrWhiteSpace(dto.PhoneNumber) ? null : dto.PhoneNumber.Trim();

        if (string.IsNullOrWhiteSpace(dto.Email) || dto.Email.Length > 150 || !ValidationPatterns.Email.IsMatch(dto.Email))
            throw new BusinessException("Email không đúng định dạng");

        if (string.IsNullOrWhiteSpace(dto.Password) || dto.Password.Length > 100)
            throw new BusinessException("Mật khẩu không hợp lệ");

        if (!ValidationPatterns.Password.IsMatch(dto.Password))
            throw new BusinessException("Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt");

        if (string.IsNullOrWhiteSpace(dto.FullName) || dto.FullName.Length > 150)
            throw new BusinessException("Họ tên không hợp lệ");

        if (!string.IsNullOrEmpty(dto.PhoneNumber) && !ValidationPatterns.Phone.IsMatch(dto.PhoneNumber))
            throw new BusinessException("Số điện thoại phải gồm 10-11 chữ số và bắt đầu bằng số 0");

        if (dto.RoleCode != RoleCode.Student && dto.RoleCode != RoleCode.Employer)
            throw new BusinessException("Vai trò phải là 'student' hoặc 'employer'");

        if (dto.RoleCode == RoleCode.Student)
        {
            var allowedDomains = config.GetSection("Auth:AllowedStudentEmailDomains")
                .GetChildren()
                .Select(c => c.Value)
                .Where(v => v != null)
                .ToArray();

            var isAllowed = allowedDomains.Any(domain =>
                dto.Email.EndsWith("@" + domain, StringComparison.OrdinalIgnoreCase));

            if (!isAllowed)
                throw new BusinessException("Sinh viên phải đăng ký bằng email trường (ví dụ: @fpt.edu.vn)");
        }

        if (await userRepository.EmailExistsAsync(dto.Email))
            throw new BusinessException("Email này đã được đăng ký");

        if (!string.IsNullOrEmpty(dto.PhoneNumber) && await userRepository.PhoneExistsAsync(dto.PhoneNumber))
            throw new BusinessException("Số điện thoại này đã được đăng ký");

        var role = await roleRepository.GetByCodeAsync(dto.RoleCode);
        if (role is null)
            throw new BusinessException("Vai trò không hợp lệ");

        var user = new User
        {
            FullName = dto.FullName,
            Email = dto.Email,
            PhoneNumber = dto.PhoneNumber,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            RoleId = role.Id,
            KycStatus = "pending",
            AccountStatus = "pending",
            ReliabilityScore = 100,
            JobsDoneCount = 0,
            JoinedAt = DateTime.UtcNow
        };

        await userRepository.AddAsync(user);

        try
        {
            await userRepository.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (IsDuplicateKeyError(ex))
        {
            logger.LogWarning(ex, "Đăng ký thất bại do trùng dữ liệu (race condition) cho email {Email}", dto.Email);
            throw new BusinessException("Email hoặc số điện thoại này đã được đăng ký");
        }

        var verifyTokenPlain = jwtService.GenerateRefreshTokenString();

        await authTokenRepository.AddAsync(new AuthToken
        {
            UserId = user.Id,
            TokenType = "email_verify",
            TokenHash = TokenHasher.HashToken(verifyTokenPlain),
            ExpiresAt = DateTime.UtcNow.AddHours(24),
            CreatedAt = DateTime.UtcNow
        });
        await authTokenRepository.SaveChangesAsync();

        var verifyLink = $"{config["Frontend:BaseUrl"]}/verify-email?token={Uri.EscapeDataString(verifyTokenPlain)}";

        try
        {
            await emailService.SendVerificationEmailAsync(user.Email, user.FullName, verifyLink);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Gửi email xác thực thất bại cho user {UserId}", user.Id);
        }

        var emailLabel = dto.RoleCode == RoleCode.Student ? "email trường" : "email";

        return new RegisterResultDto
        {
            UserId = user.Id,
            Email = user.Email,
            Message = $"Đăng ký thành công. Vui lòng kiểm tra {emailLabel} để xác thực tài khoản trước khi đăng nhập."
        };
    }

    private static bool IsDuplicateKeyError(DbUpdateException ex)
    {
        return ex.InnerException is MySqlException mysqlEx && mysqlEx.Number == 1062;
    }
}