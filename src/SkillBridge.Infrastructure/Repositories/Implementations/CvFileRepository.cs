using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Repositories.Interfaces;

namespace SkillBridge.Infrastructure.Repositories.Implementations;

public class CvFileRepository : ICvFileRepository
{
    private readonly SkillBridgeDbContext _context;

    public CvFileRepository(SkillBridgeDbContext context)
    {
        _context = context;
    }

    public async Task<List<CvFile>> GetByStudentIdAsync(int studentId)
    {
        return await _context.CvFiles
            .Include(c => c.Category)
            .Where(c => c.StudentId == studentId)
            .OrderByDescending(c => c.UploadedAt)
            .ToListAsync();
    }

    public async Task<CvFile?> GetByIdAsync(int id)
    {
        return await _context.CvFiles
            .Include(c => c.Category)
            .FirstOrDefaultAsync(c => c.Id == id);
    }

    public async Task AddAsync(CvFile cvFile)
    {
        await _context.CvFiles.AddAsync(cvFile);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(CvFile cvFile)
    {
        _context.CvFiles.Update(cvFile);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(CvFile cvFile)
    {
        _context.CvFiles.Remove(cvFile);
        await _context.SaveChangesAsync();
    }
}
