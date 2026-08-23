using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs;
using SkillBridge.Application.Interfaces;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Repositories.Interfaces;

namespace SkillBridge.Infrastructure.Services
{
    public class RefreshTokenService : IRefreshTokenService
    {
        private readonly IAuthTokenRepository authTokenRepository;
        private readonly IJwtService jwtService;

        public RefreshTokenService(IAuthTokenRepository _authTokenRepository, IJwtService _jwtService)
        {
            authTokenRepository = _authTokenRepository;
            jwtService = _jwtService;
        }

        public async Task<(AuthResponseDto Result, string RefreshToken)> RefreshAsync(string refreshToken)
        {
            if (string.IsNullOrWhiteSpace(refreshToken))
                throw new BusinessException("Refresh token không hợp lệ");

            var tokenHash = TokenHasher.HashToken(refreshToken);
            var token = await authTokenRepository.GetTokenByHashAsync(tokenHash, TokenTypes.Refresh);

            if (token is null)
                throw new BusinessException("Đã hết hạn phiên làm việc");

            if (token.UsedAt != null)
            {
                if (token.UsedAt < DateTime.UtcNow.AddSeconds(-30))
                {
                    await authTokenRepository.InvalidateAllActiveTokensAsync(token.UserId, TokenTypes.Refresh);
                    throw new BusinessException("Phiên làm việc đã bị thu hồi do phát hiện bất thường.");
                }
                throw new BusinessException("Phiên làm việc vừa được làm mới, vui lòng tải lại trang.", isGraceWindow: true);
            }

            if (token.ExpiresAt <= DateTime.UtcNow)
                throw new BusinessException("Đã hết hạn phiên làm việc");

            var user = token.User;

            if (user.AccountStatus == "locked" || user.AccountStatus == "blacklisted")
            {
                await authTokenRepository.InvalidateAllActiveTokensAsync(user.Id, TokenTypes.Refresh);
                throw new BusinessException("Tài khoản đã bị khóa, vui lòng liên hệ hỗ trợ");
            }

            if (user.AccountStatus == "pending")
                throw new BusinessException("Tài khoản chưa được kích hoạt, vui lòng kiểm tra email để xác thực trước khi sử dụng");

            if (user.LockoutUntil.HasValue && user.LockoutUntil > DateTime.UtcNow)
                throw new BusinessException("Tài khoản đang bị tạm khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau.");

            var updatedRows = await authTokenRepository.MarkTokenAsUsedAsync(token.Id, DateTime.UtcNow);
            if (updatedRows == 0)
            {
                var currentToken = await authTokenRepository.GetTokenByHashAsync(tokenHash, TokenTypes.Refresh);
                if (currentToken?.UsedAt != null)
                {
                    if (currentToken.UsedAt < DateTime.UtcNow.AddSeconds(-30))
                    {
                        await authTokenRepository.InvalidateAllActiveTokensAsync(token.UserId, TokenTypes.Refresh);
                        throw new BusinessException("Phiên làm việc đã bị thu hồi do phát hiện bất thường.");
                    }
                    throw new BusinessException("Phiên làm việc vừa được làm mới, vui lòng tải lại trang.", isGraceWindow: true);
                }
                throw new BusinessException("Đã hết hạn phiên làm việc");
            }

            var newAccessToken = jwtService.GenerateToken(user.Id, user.Email, user.Role.Code);
            var newRefreshToken = jwtService.GenerateRefreshTokenString();

            await authTokenRepository.AddAsync(new AuthToken
            {
                UserId = user.Id,
                TokenType = TokenTypes.Refresh,
                TokenHash = TokenHasher.HashToken(newRefreshToken),
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                CreatedAt = DateTime.UtcNow
            });

            await authTokenRepository.SaveChangesAsync();

            var result = new AuthResponseDto
            {
                Token = newAccessToken,
                UserId = user.Id,
                FullName = user.FullName,
                Email = user.Email,
                RoleCode = user.Role.Code
            };

            return (result, newRefreshToken);
        }
    }
}