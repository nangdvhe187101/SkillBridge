using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;
using SkillBridge.Application.Interfaces;
using SkillBridge.Application.Interfaces.Email;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Repositories.Interfaces;

namespace SkillBridge.Infrastructure.Services.Email
{
    public class ResendVerificationService : IResendVerificationService
    {
        private const string GenericMessage = "Nếu email tồn tại và chưa xác thực, chúng tôi đã gửi link xác thực";

        private readonly IUserRepository userRepository;
        private readonly IAuthTokenRepository authTokenRepository;
        private readonly IEmailService emailService;
        private readonly IJwtService jwtService;
        private readonly IConfiguration config;
        private readonly ILogger<ResendVerificationService> logger;

        private readonly int resendCooldownSeconds;

        public ResendVerificationService(
            IUserRepository _userRepository,
            IAuthTokenRepository _authTokenRepository,
            IEmailService _emailService,
            IJwtService _jwtService,
            IConfiguration _config,
            ILogger<ResendVerificationService> _logger)
        {
            userRepository = _userRepository;
            authTokenRepository = _authTokenRepository;
            emailService = _emailService;
            jwtService = _jwtService;
            config = _config;
            logger = _logger;

            resendCooldownSeconds = config.GetValue<int?>("Auth:ResendVerificationCooldownSeconds") ?? 60;
        }

        public async Task<string> ResendAsync(string email)
        {
            var normalizedEmail = email?.Trim().ToLowerInvariant() ?? string.Empty;
            var user = await userRepository.GetByEmailAsync(normalizedEmail);
            if (user is null || user.AccountStatus != "pending")
                return GenericMessage;

            var lastToken = await authTokenRepository.GetLatestTokenByUserAsync(user.Id, TokenTypes.EmailVerify);
            if (lastToken != null)
            {
                var cooldownEnd = lastToken.CreatedAt.AddSeconds(resendCooldownSeconds);
                if (cooldownEnd > DateTime.UtcNow)
                {
                    var waitSeconds = (int)Math.Ceiling((cooldownEnd - DateTime.UtcNow).TotalSeconds);
                    throw new BusinessException($"Vui lòng đợi {waitSeconds} giây trước khi gửi lại email xác thực.");
                }
            }

            await authTokenRepository.InvalidateAllActiveTokensAsync(user.Id, TokenTypes.EmailVerify);

            var verifyTokenPlain = jwtService.GenerateRefreshTokenString();
            await authTokenRepository.AddAsync(new AuthToken
            {
                UserId = user.Id,
                TokenType = TokenTypes.EmailVerify,
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
                logger.LogError(ex, "Gửi email gửi lại xác thực thất bại cho user {UserId}", user.Id);
            }

            return GenericMessage;
        }
    }
}