using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Interfaces.Users;
using SkillBridge.Infrastructure.Data;

namespace SkillBridge.Infrastructure.Services.Users;

public class UserReliabilityService : IUserReliabilityService
{
    private readonly SkillBridgeDbContext _dbContext;
    private readonly ILogger<UserReliabilityService> _logger;

    public UserReliabilityService(SkillBridgeDbContext dbContext, ILogger<UserReliabilityService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task PenalizeScoreAsync(int userId, int scoreLoss, string reason, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null) return;

        var oldScore = user.ReliabilityScore;
        user.ReliabilityScore = Math.Max(0, user.ReliabilityScore - scoreLoss);

        _logger.LogWarning("Người dùng {UserId} bị trừ {ScoreLoss} điểm uy tín ({OldScore} -> {NewScore}). Lý do: {Reason}",
            userId, scoreLoss, oldScore, user.ReliabilityScore, reason);
    }

    public async Task RewardCompletionAsync(int studentId, int scoreGain = 3, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == studentId, cancellationToken);
        if (user == null) return;

        var oldScore = user.ReliabilityScore;
        user.JobsDoneCount += 1;
        user.ReliabilityScore = Math.Min(100, user.ReliabilityScore + scoreGain);

        _logger.LogInformation("Sinh viên {StudentId} hoàn thành công việc. JobsDone: {JobsDone}, Điểm uy tín: {OldScore} -> {NewScore}.",
            studentId, user.JobsDoneCount, oldScore, user.ReliabilityScore);
    }
}
