using System.Collections.Generic;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs;

namespace SkillBridge.Application.Interfaces
{
    public interface IStudentVerificationService
    {
        Task<List<SchoolDto>> GetSchoolsAsync();
        Task<StudentVerificationResponseDto> SubmitVerificationAsync(int userId, SubmitStudentVerificationDto dto);
        Task<StudentVerificationResponseDto?> GetLatestVerificationAsync(int userId);
        Task<List<StudentVerificationResponseDto>> GetPendingVerificationsForAdminAsync();
        Task<StudentVerificationResponseDto> ReviewVerificationAsync(int requestId, int adminId, AdminReviewVerificationDto dto);
        Task<StudentCardOcrResultDto> PerformOcrAsync(int requestId, CancellationToken ct = default);
    }
}
