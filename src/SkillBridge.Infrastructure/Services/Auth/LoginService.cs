using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs;
using SkillBridge.Application.Interfaces;
using SkillBridge.Application.Interfaces.Auth;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Repositories.Interfaces;

namespace SkillBridge.Infrastructure.Services
{
    public class LoginService : ILoginService
    {
        private readonly IUserRepository userRepository;
        private readonly IJwtService jwtService;
        private readonly IAuthTokenRepository authTokenRepository;
        private readonly ITokenVersionService tokenVersionService;

        private const int MaxFailedAttempts = 5;
        private const int LockoutMinutes = 15;
        private static readonly string DummyPasswordHash = "$2a$11$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

        public LoginService(
            IUserRepository _userRepository,
            IJwtService _jwtService,
            IAuthTokenRepository _authTokenRepository,
            ITokenVersionService _tokenVersionService)
        {
            userRepository = _userRepository;
            jwtService = _jwtService;
            authTokenRepository = _authTokenRepository;
            tokenVersionService = _tokenVersionService;
        }

        public async Task<(AuthResponseDto Result, string RefreshToken)> LoginAsync(LoginDto dto)
        {
            var email = dto.Email?.Trim().ToLowerInvariant() ?? string.Empty;
            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(dto.Password))
                throw new BusinessException("Vui lòng nhập email và mật khẩu");

            var user = await userRepository.GetByEmailWithRoleAsync(email);

            // 1. Nếu user không tồn tại -> Chạy Dummy Hash để chống Timing Attack
            if (user is null)
            {
                BCrypt.Net.BCrypt.Verify(dto.Password, DummyPasswordHash);
                throw new BusinessException("Email hoặc mật khẩu không đúng");
            }

            // 2. Xác thực mật khẩu trước
            var passwordValid = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);

            if (!passwordValid)
            {
                // Chỉ ghi nhận lần thử nếu tài khoản hiện tại chưa bị khóa
                if (!user.LockoutUntil.HasValue || user.LockoutUntil <= DateTime.UtcNow)
                {
                    await RegisterFailedAttemptAsync(user);
                }

                // Trả về thông báo đồng nhất để chống user enumeration
                throw new BusinessException("Email hoặc mật khẩu không đúng");
            }

            // 3. Mật khẩu ĐÚNG -> Kiểm tra trạng thái tài khoản
            if (user.LockoutUntil.HasValue && user.LockoutUntil > DateTime.UtcNow)
            {
                throw new BusinessException(BuildLockoutMessage(user.LockoutUntil.Value));
            }

            if (user.AccountStatus == "pending")
                throw new BusinessException("Tài khoản chưa được kích hoạt, vui lòng kiểm tra email để xác thực trước khi đăng nhập");
            if (user.AccountStatus == "locked" || user.AccountStatus == "blacklisted")
                throw new BusinessException("Tài khoản đã bị khóa, vui lòng liên hệ hỗ trợ");

            // 4. Đăng nhập thành công -> Reset failed login attempts & lockout
            if (user.FailedLoginAttempts > 0 || user.LockoutUntil.HasValue)
            {
                user.FailedLoginAttempts = 0;
                user.LockoutUntil = null;
                await userRepository.SaveChangesAsync();
            }

            var accessToken = jwtService.GenerateToken(user.Id, user.Email, user.Role.Code, user.TokenVersion);
            var refreshToken = jwtService.GenerateRefreshTokenString();

            await authTokenRepository.AddAsync(new AuthToken
            {
                UserId = user.Id,
                TokenType = TokenTypes.Refresh,
                TokenHash = TokenHasher.HashToken(refreshToken),
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                CreatedAt = DateTime.UtcNow
            });

            await authTokenRepository.SaveChangesAsync();

            var result = new AuthResponseDto
            {
                Token = accessToken,
                UserId = user.Id,
                FullName = user.FullName,
                Email = user.Email,
                RoleCode = user.Role.Code
            };

            return (result, refreshToken);
        }

        private async Task<bool> RegisterFailedAttemptAsync(User user)
        {
            user.FailedLoginAttempts += 1;
            var justLockedOut = false;

            if (user.FailedLoginAttempts >= MaxFailedAttempts)
            {
                user.LockoutUntil = DateTime.UtcNow.AddMinutes(LockoutMinutes);
                user.FailedLoginAttempts = 0;
                user.TokenVersion += 1; // Thu hồi toàn bộ token đang lưu hành khi bị lockout
                justLockedOut = true;
            }

            await userRepository.SaveChangesAsync();

            if (justLockedOut)
            {
                await tokenVersionService.InvalidateOrUpdateVersionAsync(user.Id, user.TokenVersion);
            }

            return justLockedOut;
        }

        private static string BuildLockoutMessage(DateTime lockoutUntilUtc)
        {
            var minutesLeft = (int)Math.Ceiling((lockoutUntilUtc - DateTime.UtcNow).TotalMinutes);
            if (minutesLeft < 1) minutesLeft = 1;
            return $"Tài khoản tạm khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau {minutesLeft} phút.";
        }
    }
}