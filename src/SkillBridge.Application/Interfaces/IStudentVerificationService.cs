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
        /// <summary>
        /// Dùng cho Admin Portal: chỉ trả về hồ sơ nếu sinh viên đã thực sự gửi yêu cầu xác minh
        /// (có StudentVerificationRequest). Trả về null nếu chưa từng nộp, không suy luận từ KycStatus.
        /// </summary>
        Task<StudentVerificationResponseDto?> GetLatestSubmittedVerificationAsync(int userId);
        Task<List<StudentVerificationResponseDto>> GetPendingVerificationsForAdminAsync();
        Task<StudentVerificationResponseDto> ReviewVerificationAsync(int requestId, int adminId, AdminReviewVerificationDto dto);
        Task<StudentCardOcrResultDto> PerformOcrAsync(int requestId, CancellationToken ct = default);
    }
}
