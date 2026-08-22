using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;
using SkillBridge.Application.Interfaces.Email;
using SkillBridge.Infrastructure.Repositories.Interfaces;

namespace SkillBridge.Infrastructure.Services.Email
{
    public class VerifyEmailService : IVerifyEmailService
    {
        private readonly IAuthTokenRepository authTokenRepository;
        private readonly ILogger<VerifyEmailService> logger;
        public VerifyEmailService(IAuthTokenRepository _authTokenRepository, ILogger<VerifyEmailService> _logger)
        {
            authTokenRepository = _authTokenRepository;
            logger = _logger;
        }
        public async Task<string> VerifyEmailAsync(string token)
        {
            var tokenHash = TokenHasher.HashToken(token);

            var rowsAffected = await authTokenRepository.MarkTokenAsUsedIfValidAsync(tokenHash, TokenTypes.EmailVerify);
            if (rowsAffected == 0)
            {
                logger.LogWarning("Verify email thất bại: token không hợp lệ/hết hạn/đã dùng");
                throw new BusinessException("Link xác thực không hợp lệ, đã hết hạn, hoặc đã được sử dụng");
            }
            logger.LogInformation("Verify email thành công cho token hash {TokenHash}", tokenHash);
            return "Xác thực email thành công, bạn có thể đăng nhập ngay bây giờ";
        }
    }
}