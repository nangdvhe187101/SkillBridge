using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs;
using SkillBridge.Application.Interfaces;
using SkillBridge.Application.Interfaces.Auth;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Repositories.Interfaces;

namespace SkillBridge.Infrastructure.Services.Auth
{
    public class ForgotPasswordService : IForgotPasswordService
    {
        private const string GenericOtpMessage = "Nếu email tồn tại trong hệ thống, chúng tôi đã gửi mã OTP đến email đó.";
        private const string InvalidOtpMessage = "Mã OTP không đúng hoặc đã hết hạn.";

        private readonly IUserRepository userRepository;
        private readonly IAuthTokenRepository authTokenRepository;
        private readonly IEmailService emailService;
        private readonly IJwtService jwtService;
        private readonly IConfiguration config;
        private readonly ILogger<ForgotPasswordService> logger;

        private readonly int otpExpiryMinutes;
        private readonly int resetTokenExpiryMinutes;
        private readonly int maxOtpAttempts;
        private readonly int otpResendCooldownSeconds;

        public ForgotPasswordService(
            IUserRepository _userRepository,
            IAuthTokenRepository _authTokenRepository,
            IEmailService _emailService,
            IJwtService _jwtService,
            IConfiguration _config,
            ILogger<ForgotPasswordService> _logger)
        {
            userRepository = _userRepository;
            authTokenRepository = _authTokenRepository;
            emailService = _emailService;
            jwtService = _jwtService;
            config = _config;
            logger = _logger;

            otpExpiryMinutes = config.GetValue<int?>("PasswordReset:OtpExpiryMinutes") ?? 10;
            resetTokenExpiryMinutes = config.GetValue<int?>("PasswordReset:ResetTokenExpiryMinutes") ?? 10;
            maxOtpAttempts = config.GetValue<int?>("PasswordReset:MaxOtpAttempts") ?? 5;
            otpResendCooldownSeconds = config.GetValue<int?>("PasswordReset:OtpResendCooldownSeconds") ?? 60;
        }

        public async Task<string> RequestOtpAsync(ForgotPasswordRequestDto dto)
        {
            var user = await userRepository.GetByEmailAsync(dto.Email);
            if (user is null)
                throw new BusinessException("Email này chưa được đăng ký trong hệ thống");

            var lastOtp = await authTokenRepository.GetLatestTokenByUserAsync(user.Id, TokenTypes.PasswordResetOtp);
            if (lastOtp != null && lastOtp.CreatedAt.AddSeconds(otpResendCooldownSeconds) > DateTime.UtcNow)
            {
                var secondsLeft = (int)(lastOtp.CreatedAt.AddSeconds(otpResendCooldownSeconds) - DateTime.UtcNow).TotalSeconds;
                throw new BusinessException($"Vui lòng đợi {secondsLeft} giây trước khi yêu cầu gửi lại mã OTP.");
            }

            await authTokenRepository.InvalidateAllActiveTokensAsync(user.Id, TokenTypes.PasswordResetOtp);

            var otp = OtpGenerator.GenerateOtp();

            await authTokenRepository.AddAsync(new AuthToken
            {
                UserId = user.Id,
                TokenType = TokenTypes.PasswordResetOtp,
                TokenHash = TokenHasher.HashToken(otp),
                ExpiresAt = DateTime.UtcNow.AddMinutes(otpExpiryMinutes),
                CreatedAt = DateTime.UtcNow
            });
            await authTokenRepository.SaveChangesAsync();

            try
            {
                await emailService.SendPasswordResetOtpAsync(user.Email, user.FullName, otp);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Gửi OTP quên mật khẩu thất bại cho user {UserId}", user.Id);
            }

            return "Mã OTP đã được gửi đến email của bạn";
        }

        public async Task<VerifyOtpResultDto> VerifyOtpAsync(VerifyOtpDto dto)
        {
            var user = await userRepository.GetByEmailAsync(dto.Email);
            if (user is null)
                throw new BusinessException(InvalidOtpMessage);

            var activeOtp = await authTokenRepository.GetActiveTokenByUserAsync(user.Id, TokenTypes.PasswordResetOtp);
            if (activeOtp is null)
                throw new BusinessException(InvalidOtpMessage);

            if (activeOtp.AttemptCount >= maxOtpAttempts)
                throw new BusinessException("Mã OTP đã bị khóa do nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.");

            var inputHash = TokenHasher.HashToken(dto.Otp);
            if (!ConstantTimeEquals(inputHash, activeOtp.TokenHash))
            {
                activeOtp.AttemptCount += 1;
                await authTokenRepository.SaveChangesAsync();
                throw new BusinessException(InvalidOtpMessage);
            }

            activeOtp.UsedAt = DateTime.UtcNow;

            var resetTokenPlain = jwtService.GenerateRefreshTokenString();
            await authTokenRepository.AddAsync(new AuthToken
            {
                UserId = user.Id,
                TokenType = TokenTypes.PasswordReset,
                TokenHash = TokenHasher.HashToken(resetTokenPlain),
                ExpiresAt = DateTime.UtcNow.AddMinutes(resetTokenExpiryMinutes),
                CreatedAt = DateTime.UtcNow
            });
            await authTokenRepository.SaveChangesAsync();

            return new VerifyOtpResultDto { ResetToken = resetTokenPlain };
        }

        public async Task<string> ResetPasswordAsync(ResetPasswordDto dto)
        {
            if (!ValidationPatterns.Password.IsMatch(dto.NewPassword))
                throw new BusinessException("Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt");

            var tokenHash = TokenHasher.HashToken(dto.ResetToken);
            var tokenEntity = await authTokenRepository.GetValidTokenAsync(tokenHash, TokenTypes.PasswordReset);
            if (tokenEntity is null)
                throw new BusinessException("Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn");

            var user = tokenEntity.User;

            if (BCrypt.Net.BCrypt.Verify(dto.NewPassword, user.PasswordHash))
                throw new BusinessException("Mật khẩu mới không được trùng với mật khẩu cũ");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            tokenEntity.UsedAt = DateTime.UtcNow;

            await authTokenRepository.InvalidateAllActiveTokensAsync(user.Id, TokenTypes.Refresh);

            await authTokenRepository.SaveChangesAsync();

            try
            {
                await emailService.SendPasswordChangedNotificationAsync(user.Email, user.FullName);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Gửi email thông báo đổi mật khẩu thất bại cho user {UserId}", user.Id);
            }

            return "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.";
        }

        private static bool ConstantTimeEquals(string a, string b)
        {
            var bytesA = System.Text.Encoding.UTF8.GetBytes(a);
            var bytesB = System.Text.Encoding.UTF8.GetBytes(b);

            if (bytesA.Length != bytesB.Length)
                return false;

            return System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(bytesA, bytesB);
        }
    }
}