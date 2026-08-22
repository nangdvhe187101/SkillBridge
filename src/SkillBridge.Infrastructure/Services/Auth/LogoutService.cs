using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SkillBridge.Application.Common;
using SkillBridge.Application.Interfaces.Auth;
using SkillBridge.Infrastructure.Repositories.Interfaces;

namespace SkillBridge.Infrastructure.Services.Auth
{
    public class LogoutService : ILogoutService
    {
        private readonly IAuthTokenRepository authTokenRepository;
        public LogoutService(IAuthTokenRepository _authTokenRepository)
        {
            authTokenRepository = _authTokenRepository;
        }

        public async Task LogoutAsync(string refreshToken)
        {
            if (string.IsNullOrWhiteSpace(refreshToken))
                return;

            var tokenHash = TokenHasher.HashToken(refreshToken);

            var existing = await authTokenRepository.GetValidTokenAsync(tokenHash, TokenTypes.Refresh);
            if (existing is null)
                return;

            existing.UsedAt = DateTime.UtcNow;
            await authTokenRepository.SaveChangesAsync();
        }
    }
}