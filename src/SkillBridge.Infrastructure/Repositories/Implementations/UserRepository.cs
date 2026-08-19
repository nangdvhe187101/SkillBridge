using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Repositories.Interfaces;

namespace SkillBridge.Infrastructure.Services
{
    public class UserRepository : IUserRepository
    {
        private readonly SkillBridgeDbContext context;
        public UserRepository(SkillBridgeDbContext _context)
        {
            context = _context;
        }

        public async Task<User?> GetByEmailAsync(string email)
        => await context.Users.FirstOrDefaultAsync(u => u.Email == email);

        public async Task<User?> GetByEmailWithRoleAsync(string email)
        => await context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Email == email);

        public async Task<bool> EmailExistsAsync(string email)
        => await context.Users.AnyAsync(u => u.Email == email);

        public async Task<bool> PhoneExistsAsync(string phoneNumber)
        => await context.Users.AnyAsync(u => u.PhoneNumber == phoneNumber);

        public async Task AddAsync(User user) => await context.Users.AddAsync(user);

        public async Task SaveChangesAsync() => await context.SaveChangesAsync();

    }
}