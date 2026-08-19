using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Repositories.Interfaces
{
    public interface IAuthTokenRepository
    {
        Task AddAsync(AuthToken token);
        Task<AuthToken?> GetValidTokenAsync(string tokenHash, string tokenType);
        Task<int> MarkTokenAsUsedIfValidAsync(string tokenHash, string tokenType);
        Task SaveChangesAsync();
        Task<AuthToken?> GetActiveTokenByUserAsync(int userId, string tokenType);
        Task<AuthToken?> GetLatestTokenByUserAsync(int userId, string tokenType);
        Task InvalidateAllActiveTokensAsync(int userId, string tokenType);
    }
}