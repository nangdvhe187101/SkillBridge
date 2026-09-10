using System.Threading;
using System.Threading.Tasks;

namespace SkillBridge.Application.Interfaces.Users;

public interface IUserReliabilityService
{
    Task PenalizeScoreAsync(int userId, int scoreLoss, string reason, CancellationToken cancellationToken = default);
    Task RewardCompletionAsync(int studentId, int scoreGain = 3, CancellationToken cancellationToken = default);
}
