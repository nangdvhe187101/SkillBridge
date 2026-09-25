using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs;
using SkillBridge.Application.Interfaces;
using SkillBridge.Application.Interfaces.Auth;
using SkillBridge.Infrastructure.Repositories.Interfaces;

namespace SkillBridge.Infrastructure.Services.Auth
{
    public class ChangePasswordService : IChangePasswordService
    {
        private readonly IUserRepository userRepository;
        private readonly IAuthTokenRepository authTokenRepository;
        private readonly IEmailService emailService;
        private readonly ITokenVersionService tokenVersionService;
        private readonly ILogger<ChangePasswordService> logger;

        public ChangePasswordService(
            IUserRepository _userRepository,
            IAuthTokenRepository _authTokenRepository,
            IEmailService _emailService,
            ITokenVersionService _tokenVersionService,
            ILogger<ChangePasswordService> _logger)
        {
            userRepository = _userRepository;
            authTokenRepository = _authTokenRepository;
            emailService = _emailService;
            tokenVersionService = _tokenVersionService;
            logger = _logger;
        }

        public async Task<string> ChangePasswordAsync(int userId, ChangePasswordDto dto)
        {
            var currentPassword = dto.CurrentPassword ?? string.Empty;
            var newPassword = dto.NewPassword ?? string.Empty;

            if (string.IsNullOrEmpty(newPassword))
                throw new BusinessException("Vui lòng nhập mật khẩu mới");

            if (newPassword.Length > 100)
                throw new BusinessException("Mật khẩu mới không được vượt quá 100 ký tự");

            if (!ValidationPatterns.Password.IsMatch(newPassword))
                throw new BusinessException("Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt");

            var user = await userRepository.GetByIdAsync(userId);
            if (user is null)
                throw new BusinessException("Không tìm thấy thông tin người dùng");

            var isGoogleSsoAccountWithoutPassword = !string.IsNullOrEmpty(user.PasswordHash) &&
                                                    user.PasswordHash.StartsWith("GOOGLE_SSO:");

            if (!isGoogleSsoAccountWithoutPassword)
            {
                // Tài khoản thông thường đã có mật khẩu: Bắt buộc kiểm tra mật khẩu hiện tại
                if (string.IsNullOrEmpty(currentPassword))
                    throw new BusinessException("Vui lòng nhập mật khẩu hiện tại");

                var currentValid = BCrypt.Net.BCrypt.Verify(currentPassword, user.PasswordHash);
                if (!currentValid)
                    throw new BusinessException("Mật khẩu hiện tại không chính xác");

                var isDuplicate = BCrypt.Net.BCrypt.Verify(newPassword, user.PasswordHash);
                if (isDuplicate)
                    throw new BusinessException("Mật khẩu mới không được trùng với mật khẩu cũ");
            }

            // Lưu mật khẩu chuẩn (bỏ tiền tố GOOGLE_SSO:)
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
            user.FailedLoginAttempts = 0;
            user.LockoutUntil = null;
            user.TokenVersion += 1; // Thu hồi toàn bộ JWT Access Token cũ

            await userRepository.SaveChangesAsync();

            // Cập nhật / Invalidate cache ngay lập tức để chặn cửa sổ trễ
            await tokenVersionService.InvalidateOrUpdateVersionAsync(user.Id, user.TokenVersion);

            await authTokenRepository.InvalidateAllActiveTokensAsync(user.Id, TokenTypes.Refresh);
            await authTokenRepository.InvalidateAllActiveTokensAsync(user.Id, TokenTypes.PasswordReset);
            await authTokenRepository.InvalidateAllActiveTokensAsync(user.Id, TokenTypes.PasswordResetOtp);

            try
            {
                await emailService.SendPasswordChangedNotificationAsync(user.Email, user.FullName);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Gửi thông báo đổi mật khẩu thất bại cho user {UserId}", user.Id);
            }

            return isGoogleSsoAccountWithoutPassword
                ? "Thiết lập mật khẩu thành công! Giờ đây bạn có thể đăng nhập bằng cả Google và Mật khẩu mới."
                : "Đổi mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới.";
        }
    }
}
