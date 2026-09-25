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
        private readonly IConfiguration config;
        private readonly ILogger<GoogleAuthService> logger;

        public GoogleAuthService(
            IUserRepository _userRepository,
            IRoleRepository _roleRepository,
            IAuthTokenRepository _authTokenRepository,
            IJwtService _jwtService,
            IStorageService _storageService,
            IConfiguration _config,
            ILogger<GoogleAuthService> _logger)
        {
            userRepository = _userRepository;
            roleRepository = _roleRepository;
            authTokenRepository = _authTokenRepository;
            jwtService = _jwtService;
            storageService = _storageService;
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
            var targetRoleCode = string.IsNullOrWhiteSpace(dto.RoleCode) ? RoleCode.Student : dto.RoleCode.Trim().ToLowerInvariant();

            // Nếu người dùng chọn hoặc đang là sinh viên, kiểm tra domain trường FPT/FE
            if (targetRoleCode == RoleCode.Student)
            {
                var isEduDomain = email.EndsWith("@fpt.edu.vn", StringComparison.OrdinalIgnoreCase) ||
                                  email.EndsWith("@fe.edu.vn", StringComparison.OrdinalIgnoreCase);

                if (!isEduDomain)
                {
                    throw new BusinessException("Tài khoản sinh viên bắt buộc sử dụng email trường (@fpt.edu.vn hoặc @fe.edu.vn). Vui lòng chọn tài khoản Google sinh viên của bạn.");
                }
            }

            var user = await userRepository.GetByEmailAsync(email);

            if (user == null)
            {
                // Người dùng mới đăng ký lần đầu bằng Google
                var role = await roleRepository.GetByCodeAsync(targetRoleCode);
                if (role == null)
                {
                    throw new BusinessException("Vai trò người dùng không hợp lệ.");
                }

                user = new User
                {
                    FullName = string.IsNullOrWhiteSpace(payload.Name) ? email.Split('@')[0] : payload.Name,
                    Email = email,
                    AvatarUrl = payload.Picture,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N")),
                    RoleId = role.Id,
                    KycStatus = "pending",
                    AccountStatus = "active", // Google đã xác minh chính chủ -> Kích hoạt ngay
                    ReliabilityScore = 100,
                    JobsDoneCount = 0,
                    JoinedAt = DateTime.UtcNow
                };

                await userRepository.AddAsync(user);
                await userRepository.SaveChangesAsync();

                // Nạp lại User cùng Role
                user = await userRepository.GetByEmailAsync(email);
            }
            else
            {
                // Người dùng đã tồn tại -> Kiểm tra trạng thái
                if (user.AccountStatus == "locked" || user.AccountStatus == "blacklisted")
                {
                    throw new BusinessException("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.");
                }

                var updated = false;

                // Tự động kích hoạt nếu trước đó bị pending
                if (user.AccountStatus == "pending")
                {
                    user.AccountStatus = "active";
                    updated = true;
                }

                // Cập nhật Avatar từ Google nếu user chưa có avatar
                if (string.IsNullOrWhiteSpace(user.AvatarUrl) && !string.IsNullOrWhiteSpace(payload.Picture))
                {
                    user.AvatarUrl = payload.Picture;
                    updated = true;
                }

                if (user.FailedLoginAttempts > 0 || user.LockoutUntil.HasValue)
                {
                    user.FailedLoginAttempts = 0;
                    user.LockoutUntil = null;
                    updated = true;
                }

                if (updated)
                {
                    await userRepository.SaveChangesAsync();
                }
            }

            if (user == null || user.Role == null)
            {
                throw new BusinessException("Không thể xác thực thông tin tài khoản.");
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
                AvatarUrl = storageService.GetPublicUrl(user.AvatarUrl)
            };

            return (result, refreshToken);
        }
    }
}
