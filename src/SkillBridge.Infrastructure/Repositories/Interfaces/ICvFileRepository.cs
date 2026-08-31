using System.Collections.Generic;
using System.Threading.Tasks;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Repositories.Interfaces;

public interface ICvFileRepository
{
    Task<List<CvFile>> GetByStudentIdAsync(int studentId);
    Task<CvFile?> GetByIdAsync(int id);
    Task AddAsync(CvFile cvFile);
    Task UpdateAsync(CvFile cvFile);
    Task DeleteAsync(CvFile cvFile);
}
