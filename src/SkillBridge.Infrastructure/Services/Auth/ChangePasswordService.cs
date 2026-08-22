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
        private readonly ILogger<ChangePasswordService> logger;

        public ChangePasswordService(
            IUserRepository _userRepository,
            IAuthTokenRepository _authTokenRepository,
            IEmailService _emailService,
            ILogger<ChangePasswordService> _logger)
        {
            userRepository = _userRepository;
            authTokenRepository = _authTokenRepository;
            emailService = _emailService;
            logger = _logger;
        }

        public async Task<string> ChangePasswordAsync(int userId, ChangePasswordDto dto)
        {
            var currentPassword = dto.CurrentPassword ?? string.Empty;
            var newPassword = dto.NewPassword ?? string.Empty;

            if (string.IsNullOrEmpty(currentPassword) || string.IsNullOrEmpty(newPassword))
                throw new BusinessException("Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới");

            if (newPassword.Length > 100)
                throw new BusinessException("Mật khẩu mới không được vượt quá 100 ký tự");

            if (!ValidationPatterns.Password.IsMatch(newPassword))
                throw new BusinessException("Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt");

            var user = await userRepository.GetByIdAsync(userId);
            if (user is null)
                throw new BusinessException("Không tìm thấy thông tin người dùng");

            var currentValid = await Task.Run(() => BCrypt.Net.BCrypt.Verify(currentPassword, user.PasswordHash));
            if (!currentValid)
                throw new BusinessException("Mật khẩu hiện tại không chính xác");

            var isDuplicate = await Task.Run(() => BCrypt.Net.BCrypt.Verify(newPassword, user.PasswordHash));
            if (isDuplicate)
                throw new BusinessException("Mật khẩu mới không được trùng với mật khẩu cũ");

            user.PasswordHash = await Task.Run(() => BCrypt.Net.BCrypt.HashPassword(newPassword));
            user.FailedLoginAttempts = 0;
            user.LockoutUntil = null;

            await userRepository.SaveChangesAsync();

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

            return "Đổi mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới.";
        }
    }
}
