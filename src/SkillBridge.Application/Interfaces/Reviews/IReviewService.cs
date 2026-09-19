using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Reviews;

namespace SkillBridge.Application.Interfaces.Reviews;

public interface IReviewService
{
    Task<ReviewDto> CreateReviewAsync(int reviewerId, CreateReviewRequest request, CancellationToken cancellationToken = default);
    Task<JobReviewsSummaryDto> GetJobReviewsAsync(int jobId, int? currentUserId = null, CancellationToken cancellationToken = default);
    Task<List<ReviewDto>> GetUserReviewsAsync(int userId, CancellationToken cancellationToken = default);
}
