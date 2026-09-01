using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using SkillBridge.Application.Interfaces.Auth;
using SkillBridge.Infrastructure.Data;

namespace SkillBridge.Infrastructure.Services.Auth
{
    public class TokenVersionService : ITokenVersionService
    {
        private readonly IDistributedCache _cache;
        private readonly SkillBridgeDbContext _dbContext;
        private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(3);

        public TokenVersionService(IDistributedCache cache, SkillBridgeDbContext dbContext)
        {
            _cache = cache;
            _dbContext = dbContext;
        }

        public async Task<int> GetTokenVersionAsync(int userId)
        {
            var cacheKey = $"user_token_version_{userId}";

            var cachedValue = await _cache.GetStringAsync(cacheKey);
            if (cachedValue != null && int.TryParse(cachedValue, out var version))
            {
                return version;
            }

            var user = await _dbContext.Users
                .AsNoTracking()
                .Where(u => u.Id == userId)
                .Select(u => (int?)u.TokenVersion)
                .FirstOrDefaultAsync();

            var tokenVersion = user ?? -1;

            await _cache.SetStringAsync(cacheKey, tokenVersion.ToString(), new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = CacheDuration
            });

            return tokenVersion;
        }

        public async Task InvalidateOrUpdateVersionAsync(int userId, int newVersion)
        {
            var cacheKey = $"user_token_version_{userId}";
            await _cache.SetStringAsync(cacheKey, newVersion.ToString(), new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = CacheDuration
            });
        }
    }
}
