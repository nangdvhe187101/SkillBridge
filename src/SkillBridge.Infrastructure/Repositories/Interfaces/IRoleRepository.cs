using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Repositories.Interfaces
{
    public interface IRoleRepository
    {
        Task<Role?> GetByCodeAsync(string code);
    }
}