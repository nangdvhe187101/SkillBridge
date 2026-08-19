using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Repositories.Interfaces;

namespace SkillBridge.Infrastructure.Repositories.Implementations
{
    public class RoleRepository : IRoleRepository
    {
        private readonly SkillBridgeDbContext context;
        public RoleRepository(SkillBridgeDbContext _context)
        {
            context = _context;
        }
        public async Task<Role?> GetByCodeAsync(string code)
        => await context.Roles.FirstOrDefaultAsync(r => r.Code == code);
    }
}