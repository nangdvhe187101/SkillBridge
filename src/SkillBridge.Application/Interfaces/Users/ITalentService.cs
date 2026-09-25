using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Jobs;
using SkillBridge.Application.DTOs.Users;

namespace SkillBridge.Application.Interfaces.Users;

public interface ITalentService
{
    Task<PagedResult<TalentItemDto>> GetTalentsAsync(TalentFilterRequest request, CancellationToken ct = default);
    Task<InviteToJobResponseDto> InviteStudentToJobAsync(int employerId, int studentId, InviteToJobRequest request, CancellationToken ct = default);
}
