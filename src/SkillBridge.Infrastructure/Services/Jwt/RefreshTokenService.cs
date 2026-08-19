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
            var existing = await authTokenRepository.GetValidTokenAsync(tokenHash, "refresh");

            if (existing is null) throw new BusinessException("Đã hết hạn phiên làm việc");

            existing.UsedAt = DateTime.UtcNow;

            var user = existing.User;
            var newAccessToken = jwtService.GenerateToken(user.Id, user.Email, user.Role.Code);
            var newRefreshToken = jwtService.GenerateRefreshTokenString();

            await authTokenRepository.AddAsync(new AuthToken
            {
                UserId = user.Id,
                TokenType = "refresh",
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