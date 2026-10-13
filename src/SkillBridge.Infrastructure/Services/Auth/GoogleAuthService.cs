using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Google.Apis.Auth;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs;
using SkillBridge.Application.Interfaces;
using SkillBridge.Application.Interfaces.Auth;
using SkillBridge.Application.Interfaces.Storage;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Repositories.Interfaces;

namespace SkillBridge.Infrastructure.Services.Auth
{
    public class GoogleAuthService : IGoogleAuthService
    {
        private readonly IUserRepository userRepository;
        private readonly IRoleRepository roleRepository;
        private readonly IAuthTokenRepository authTokenRepository;
        private readonly IJwtService jwtService;
        private readonly IStorageService storageService;
        private readonly IEmailService emailService;
        private readonly IConfiguration config;
        private readonly ILogger<GoogleAuthService> logger;

        public GoogleAuthService(
            IUserRepository _userRepository,
            IRoleRepository _roleRepository,
            IAuthTokenRepository _authTokenRepository,
            IJwtService _jwtService,
            IStorageService _storageService,
            IEmailService _emailService,
            IConfiguration _config,
            ILogger<GoogleAuthService> _logger)
        {
            userRepository = _userRepository;
            roleRepository = _roleRepository;
            authTokenRepository = _authTokenRepository;
            jwtService = _jwtService;
            storageService = _storageService;
            emailService = _emailService;
            config = _config;
            logger = _logger;
        }

        public async Task<(AuthResponseDto Result, string RefreshToken)> GoogleLoginAsync(GoogleLoginDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.IdToken))
            {
                throw new BusinessException("Mã xác thực Google (IdToken) không hợp lệ.");
            }

            GoogleJsonWebSignature.Payload payload;
            try
            {
                var settings = new GoogleJsonWebSignature.ValidationSettings();
                var clientId = config["Google:ClientId"];
                if (!string.IsNullOrWhiteSpace(clientId))
                {
                    settings.Audience = new List<string> { clientId };
                }

                payload = await GoogleJsonWebSignature.ValidateAsync(dto.IdToken, settings);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Xác thực Google ID Token thất bại.");
                throw new BusinessException("Mã xác thực Google không hợp lệ hoặc đã hết hạn.");
            }

            if (payload == null || string.IsNullOrWhiteSpace(payload.Email))
            {
                throw new BusinessException("Không tìm thấy thông tin email từ tài khoản Google.");
            }

            var email = payload.Email.Trim().ToLowerInvariant();
            var mode = string.IsNullOrWhiteSpace(dto.Mode) ? "login" : dto.Mode.Trim().ToLowerInvariant();

            var user = await userRepository.GetByEmailWithRoleAsync(email);

            if (user != null)
            {
                if (user.AccountStatus == "locked" || user.AccountStatus == "blacklisted")
                {
                    throw new BusinessException("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.");
                }

                var updated = false;

                // Tự động kích hoạt nếu trước đó bị pending (vì Google SSO đã xác thực email chính chủ)
                if (user.AccountStatus == "pending")
                {
                    user.AccountStatus = "active";
                    updated = true;
                }

                // Cập nhật Avatar từ Google nếu user chưa có avatar
                if (string.IsNullOrWhiteSpace(user.AvatarUrl) && !string.IsNullOrWhiteSpace(payload.Picture))
                {
                    user.AvatarUrl = payload.Picture.Length > 255 ? payload.Picture.Substring(0, 255) : payload.Picture;
                    updated = true;
                }

                if (user.FailedLoginAttempts > 0 || user.LockoutUntil.HasValue)
                {
                    user.FailedLoginAttempts = 0;
                    user.LockoutUntil = null;
                    updated = true;
                }

                // Tự động liên kết tài khoản Google ID (REQ-AUTH-01)
                if (!string.IsNullOrWhiteSpace(payload.Subject))
                {
                    var hasGoogleLogin = user.ExternalLogins.Any(el => el.Provider == "google" && el.ProviderUserId == payload.Subject);
                    if (!hasGoogleLogin)
                    {
                        user.ExternalLogins.Add(new ExternalLogin
                        {
                            UserId = user.Id,
                            Provider = "google",
                            ProviderUserId = payload.Subject,
                            ProviderEmail = email,
                            CreatedAt = DateTime.UtcNow
                        });
                        updated = true;
                    }
                }

                if (updated)
                {
                    await userRepository.SaveChangesAsync();
                }
            }
            else
            {
                // Tài khoản chưa tồn tại -> Tự động đăng ký mới an toàn
                var targetRoleCode = string.Equals(dto.RoleCode, RoleCode.Employer, StringComparison.OrdinalIgnoreCase)
                    ? RoleCode.Employer
                    : RoleCode.Student;

                var role = await roleRepository.GetByCodeAsync(targetRoleCode)
                        ?? await roleRepository.GetByCodeAsync(RoleCode.Student);

                if (role == null)
                {
                    throw new BusinessException($"Không tìm thấy cấu hình vai trò '{targetRoleCode}' trong hệ thống.");
                }

                var avatar = !string.IsNullOrWhiteSpace(payload.Picture)
                    ? (payload.Picture.Length > 255 ? payload.Picture.Substring(0, 255) : payload.Picture)
                    : null;

                user = new User
                {
                    FullName = string.IsNullOrWhiteSpace(payload.Name) ? email.Split('@')[0] : payload.Name,
                    Email = email,
                    AvatarUrl = avatar,
                    PasswordHash = "GOOGLE_SSO:" + BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N")),
                    RoleId = role.Id,
                    KycStatus = "pending", // Ràng buộc đúng enum('pending','verified','rejected') của CSDL
                    AccountStatus = "active", // Google đã xác minh chính chủ -> Kích hoạt ngay
                    ReliabilityScore = 100,
                    JobsDoneCount = 0,
                    TokenVersion = 1,
                    JoinedAt = DateTime.UtcNow
                };

                if (!string.IsNullOrWhiteSpace(payload.Subject))
                {
                    user.ExternalLogins.Add(new ExternalLogin
                    {
                        Provider = "google",
                        ProviderUserId = payload.Subject,
                        ProviderEmail = email,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                await userRepository.AddAsync(user);
                await userRepository.SaveChangesAsync();

                // Nạp lại User cùng Role
                user = await userRepository.GetByEmailWithRoleAsync(email);

                // Gửi email chào mừng nếu là sinh viên
                if (user != null && targetRoleCode == RoleCode.Student)
                {
                    var targetEmail = user.Email;
                    var targetName = user.FullName;
                    _ = Task.Run(async () =>
                    {
                        try
                        {
                            await emailService.SendStudentWelcomeEmailAsync(targetEmail, targetName);
                        }
                        catch (Exception ex)
                        {
                            logger.LogWarning(ex, "Không thể gửi email chào mừng sinh viên tới {Email}", targetEmail);
                        }
                    });
                }
            }

            if (user == null || user.Role == null)
            {
                throw new BusinessException("Không thể xác thực thông tin tài khoản.");
            }

            // Tài khoản quản trị chỉ được đăng nhập qua cổng Admin (mật khẩu + 2FA)
            if (string.Equals(user.Role.Type, AdminAuthClaims.AdminRoleType, StringComparison.OrdinalIgnoreCase))
            {
                logger.LogWarning("Chặn đăng nhập Google phía người dùng cho tài khoản quản trị UserId {UserId}.", user.Id);
                throw new BusinessException("Tài khoản quản trị không thể đăng nhập bằng Google. Vui lòng dùng cổng quản trị.");
            }

            var accessToken = jwtService.GenerateToken(user.Id, user.Email, user.Role.Code, user.TokenVersion, user.Role.Type);
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
                RoleCode = user.Role.Code,
                AvatarUrl = storageService.GetPublicUrl(user.AvatarUrl),
                HasPassword = !string.IsNullOrEmpty(user.PasswordHash) && !user.PasswordHash.StartsWith("GOOGLE_SSO:")
            };

            return (result, refreshToken);
        }
    }
}
