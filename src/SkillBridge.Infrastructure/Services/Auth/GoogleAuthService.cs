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

            // Ràng buộc bảo mật tối cao: Đăng nhập Google CHỈ DÀNH RIÊNG cho sinh viên trường FPT
            var isFptStudent = email.EndsWith("@fpt.edu.vn", StringComparison.OrdinalIgnoreCase) ||
                               email.EndsWith("@fe.edu.vn", StringComparison.OrdinalIgnoreCase);

            if (!isFptStudent)
            {
                throw new BusinessException("Tính năng Đăng nhập bằng Google chỉ dành riêng cho sinh viên FPT (@fpt.edu.vn hoặc @fe.edu.vn). Nhà tuyển dụng hoặc các tài khoản khác vui lòng đăng nhập bằng Email và Mật khẩu bên dưới.");
            }

            var user = await userRepository.GetByEmailWithRoleAsync(email);

            if (user == null)
            {
                // Người dùng mới đăng ký lần đầu bằng Google -> Luôn luôn gán vai trò Sinh viên (Student)
                var role = await roleRepository.GetByCodeAsync(RoleCode.Student);
                if (role == null)
                {
                    throw new BusinessException("Không tìm thấy cấu hình vai trò sinh viên trong hệ thống.");
                }

                user = new User
                {
                    FullName = string.IsNullOrWhiteSpace(payload.Name) ? email.Split('@')[0] : payload.Name,
                    Email = email,
                    AvatarUrl = payload.Picture,
                    PasswordHash = "GOOGLE_SSO:" + BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N")),
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
                user = await userRepository.GetByEmailWithRoleAsync(email);

                // Gửi email chào mừng sinh viên mới (Non-blocking / Background)
                if (user != null)
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
                            logger.LogWarning(ex, "Không thể gửi email chào mừng sinh viên FPT tới {Email}", targetEmail);
                        }
                    });
                }
            }
            else
            {
                // Người dùng đã tồn tại -> Kiểm tra trạng thái và vai trò (Bảo vệ 2 lớp qua cả Navigation Property và RoleId)
                var studentRole = await roleRepository.GetByCodeAsync(RoleCode.Student);
                if (user.Role == null && studentRole != null && user.RoleId == studentRole.Id)
                {
                    user.Role = studentRole;
                }

                var isStudent = (user.Role != null && string.Equals(user.Role.Code, RoleCode.Student, StringComparison.OrdinalIgnoreCase))
                                || (studentRole != null && user.RoleId == studentRole.Id);

                if (!isStudent)
                {
                    throw new BusinessException("Tài khoản này thuộc vai trò Nhà tuyển dụng, không hỗ trợ đăng nhập qua Google SSO sinh viên. Vui lòng đăng nhập bằng Email và Mật khẩu.");
                }

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
                AvatarUrl = storageService.GetPublicUrl(user.AvatarUrl),
                HasPassword = !string.IsNullOrEmpty(user.PasswordHash) && !user.PasswordHash.StartsWith("GOOGLE_SSO:")
            };

            return (result, refreshToken);
        }
    }
}
