using System.Collections.Generic;
using System.Threading.Tasks;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Repositories.Interfaces;

public interface IApplicationRepository
{
    Task<JobApplication?> GetByIdAsync(int id);
    Task<JobApplication?> GetByJobAndStudentAsync(int jobId, int studentId);
    Task<bool> ExistsAsync(int jobId, int studentId);
    Task<List<JobApplication>> GetByJobIdAsync(int jobId);
    Task<List<JobApplication>> GetByStudentIdAsync(int studentId);
    Task AddAsync(JobApplication application);
    Task UpdateAsync(JobApplication application);
}
