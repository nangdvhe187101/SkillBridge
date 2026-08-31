using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using SkillBridge.Application.Interfaces.Auth;
using SkillBridge.Infrastructure.Data;

namespace SkillBridge.Infrastructure.Services.Auth
{
    public class TokenVersionService : ITokenVersionService
    {
        private readonly IMemoryCache _cache;
        private readonly SkillBridgeDbContext _dbContext;
        private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(3);

        public TokenVersionService(IMemoryCache cache, SkillBridgeDbContext dbContext)
        {
            _cache = cache;
            _dbContext = dbContext;
        }

        public async Task<int> GetTokenVersionAsync(int userId)
        {
            var cacheKey = $"user_token_version_{userId}";

            return await _cache.GetOrCreateAsync(cacheKey, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = CacheDuration;

                var user = await _dbContext.Users
                    .AsNoTracking()
                    .Where(u => u.Id == userId)
                    .Select(u => (int?)u.TokenVersion)
                    .FirstOrDefaultAsync();

                return user ?? -1;
            });
        }

        public Task InvalidateOrUpdateVersionAsync(int userId, int newVersion)
        {
            var cacheKey = $"user_token_version_{userId}";
            _cache.Set(cacheKey, newVersion, CacheDuration);
            return Task.CompletedTask;
        }
    }
}
