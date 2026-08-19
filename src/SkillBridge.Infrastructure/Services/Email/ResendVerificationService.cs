using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using SkillBridge.Application.Common;
using SkillBridge.Application.Interfaces;
using SkillBridge.Application.Interfaces.Email;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Repositories.Interfaces;

namespace SkillBridge.Infrastructure.Services.Email
{
    public class ResendVerificationService : IResendVerificationService
    {
        public readonly IUserRepository userRepository;
        public readonly IAuthTokenRepository authTokenRepository;
        public readonly IEmailService emailService;
        public readonly IJwtService jwtService;
        public readonly IConfiguration config;

        public ResendVerificationService(
            IUserRepository _userRepository,
            IAuthTokenRepository _authTokenRepository,
            IEmailService _emailService,
            IJwtService _jwtService,
            IConfiguration _config)
        {
            userRepository = _userRepository;
            authTokenRepository = _authTokenRepository;
            emailService = _emailService;
            jwtService = _jwtService;
            config = _config;
        }

        public async Task<string> ResendAsync(string email)
        {
            const string genericMessage = "Nếu email tồn tại và chưa xác thực, chúng tôi đã gửi link xác thực";
            var user = await userRepository.GetByEmailAsync(email);
            if (user is null || user.AccountStatus != "pending") return genericMessage;
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
            await emailService.SendVerificationEmailAsync(user.Email, user.FullName, verifyLink);

            return genericMessage;
        }
    }
}