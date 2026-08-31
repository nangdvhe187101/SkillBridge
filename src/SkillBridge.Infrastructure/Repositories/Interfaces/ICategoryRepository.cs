using System.Collections.Generic;
using System.Threading.Tasks;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Repositories.Interfaces;

public interface ICategoryRepository
{
    Task<IReadOnlyList<Category>> GetAllAsync();
    Task<Category?> GetByIdAsync(int id);
}
