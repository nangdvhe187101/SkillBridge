using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Repositories.Interfaces;

namespace SkillBridge.Infrastructure.Repositories.Implementations;

public class ApplicationRepository : IApplicationRepository
{
    private readonly SkillBridgeDbContext _context;

    public ApplicationRepository(SkillBridgeDbContext context)
    {
        _context = context;
    }

    public async Task<JobApplication?> GetByIdAsync(int id)
    {
        return await _context.Applications
            .Include(a => a.Job)
            .Include(a => a.Student)
            .Include(a => a.CvFile)
            .FirstOrDefaultAsync(a => a.Id == id);
    }

    public async Task<JobApplication?> GetByJobAndStudentAsync(int jobId, int studentId)
    {
        return await _context.Applications
            .Include(a => a.Job)
            .Include(a => a.CvFile)
            .FirstOrDefaultAsync(a => a.JobId == jobId && a.StudentId == studentId);
    }

    public async Task<bool> ExistsAsync(int jobId, int studentId)
    {
        return await _context.Applications
            .AnyAsync(a => a.JobId == jobId && a.StudentId == studentId);
    }

    public async Task<List<JobApplication>> GetByJobIdAsync(int jobId)
    {
        return await _context.Applications
            .Include(a => a.Student)
            .Include(a => a.CvFile)
            .Where(a => a.JobId == jobId)
            .OrderByDescending(a => a.AppliedAt)
            .ToListAsync();
    }

    public async Task<List<JobApplication>> GetByStudentIdAsync(int studentId)
    {
        return await _context.Applications
            .Include(a => a.Job)
                .ThenInclude(j => j.Employer)
            .Include(a => a.CvFile)
            .Where(a => a.StudentId == studentId)
            .OrderByDescending(a => a.AppliedAt)
            .ToListAsync();
    }

    public async Task AddAsync(JobApplication application)
    {
        await _context.Applications.AddAsync(application);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(JobApplication application)
    {
        _context.Applications.Update(application);
        await _context.SaveChangesAsync();
    }
}
