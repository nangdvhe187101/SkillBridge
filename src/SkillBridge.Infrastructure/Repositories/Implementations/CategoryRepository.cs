using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Repositories.Interfaces;

namespace SkillBridge.Infrastructure.Repositories.Implementations;

public class CategoryRepository : ICategoryRepository
{
    private readonly SkillBridgeDbContext _context;

    public CategoryRepository(SkillBridgeDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<Category>> GetAllAsync()
    {
        return await _context.Categories
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<IReadOnlyList<(Category Category, int JobCount)>> GetAllWithJobCountAsync()
    {
        var list = await _context.Categories
            .AsNoTracking()
            .Select(c => new
            {
                Category = c,
                JobCount = c.Jobs.Count(j => j.Status == "open" && j.Employer.AccountStatus != "blacklisted")
            })
            .ToListAsync();

        return list.Select(x => (x.Category, x.JobCount)).ToList();
    }

    public async Task<Category?> GetByIdAsync(int id)
    {
        return await _context.Categories
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id);
    }
}
