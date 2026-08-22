using System.Threading.Tasks;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Repositories.Interfaces
{
    public interface IUserRepository
    {
        Task<User?> GetByIdAsync(int id);
        Task<User?> GetByEmailAsync(string email);
        Task<User?> GetByEmailWithRoleAsync(string email);
        Task<bool> EmailExistsAsync(string email);
        Task<bool> PhoneExistsAsync(string phone);
        Task AddAsync(User user);
        Task SaveChangesAsync();
    }
}