using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SkillBridge.Application.Common;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Repositories.Interfaces;

namespace SkillBridge.Infrastructure.Repositories.Implementations
{
    public class AuthTokenRepository : IAuthTokenRepository
    {
        private readonly SkillBridgeDbContext context;
        public AuthTokenRepository(SkillBridgeDbContext _context)
        {
            context = _context;
        }

        public async Task AddAsync(AuthToken token) => await context.AuthTokens.AddAsync(token);

        public async Task<AuthToken?> GetValidTokenAsync(string tokenHash, string tokenType)
        {
            return await context.AuthTokens.Include(t => t.User).ThenInclude(u => u.Role)
            .FirstOrDefaultAsync(t =>
                t.TokenHash == tokenHash &&
                t.TokenType == tokenType &&
                t.UsedAt == null &&
                t.ExpiresAt > DateTime.UtcNow);
        }

        public async Task<AuthToken?> GetTokenByHashAsync(string tokenHash, string tokenType)
        {
            return await context.AuthTokens.Include(t => t.User).ThenInclude(u => u.Role)
                .FirstOrDefaultAsync(t => t.TokenHash == tokenHash && t.TokenType == tokenType);
        }

        public async Task<AuthToken?> GetLatestTokenByUserAsync(int userId, string tokenType)
        {
            return await context.AuthTokens
                .Where(t => t.UserId == userId && t.TokenType == tokenType)
                .OrderByDescending(t => t.CreatedAt)
                .FirstOrDefaultAsync();
        }
        public async Task<int> MarkTokenAsUsedIfValidAsync(string tokenHash, string tokenType)
        {
            var now = DateTime.UtcNow;
            var tokenInfo = await context.AuthTokens
                .Where(t => t.TokenHash == tokenHash
                    && t.TokenType == tokenType
                    && t.UsedAt == null
                    && t.ExpiresAt > now)
                .Select(t => new { t.Id, t.UserId })
                .FirstOrDefaultAsync();

            if (tokenInfo == null)
                return 0;

            var rows = await context.AuthTokens
                .Where(t => t.Id == tokenInfo.Id && t.UsedAt == null)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.UsedAt, now));

            if (rows > 0 && tokenType == TokenTypes.EmailVerify)
            {
                await context.Users
                    .Where(u => u.Id == tokenInfo.UserId && u.AccountStatus == "pending")
                    .ExecuteUpdateAsync(s => s.SetProperty(u => u.AccountStatus, "active"));
            }

            return rows;
        }

        public async Task SaveChangesAsync() => await context.SaveChangesAsync();
        public async Task<AuthToken?> GetActiveTokenByUserAsync(int userId, string tokenType)
        {
            return await context.AuthTokens
                .Where(t => t.UserId == userId
                    && t.TokenType == tokenType
                    && t.UsedAt == null
                    && t.ExpiresAt > DateTime.UtcNow)
                .OrderByDescending(t => t.CreatedAt)
                .FirstOrDefaultAsync();
        }

        public async Task InvalidateAllActiveTokensAsync(int userId, string tokenType)
        {
            await context.AuthTokens
                .Where(t => t.UserId == userId
                    && t.TokenType == tokenType
                    && t.UsedAt == null
                    && t.ExpiresAt > DateTime.UtcNow)
                .ExecuteUpdateAsync(setters => setters.SetProperty(t => t.UsedAt, DateTime.UtcNow));
        }

        public async Task<int> MarkTokenAsUsedAsync(int tokenId, DateTime usedAt)
        {
            return await context.AuthTokens
                .Where(t => t.Id == tokenId && t.UsedAt == null)
                .ExecuteUpdateAsync(setters => setters.SetProperty(t => t.UsedAt, usedAt));
        }
    }
}