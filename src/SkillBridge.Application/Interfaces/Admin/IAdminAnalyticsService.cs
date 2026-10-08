using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Admin;

namespace SkillBridge.Application.Interfaces.Admin;

public interface IAdminAnalyticsService
{
    Task<AdminAnalyticsOverviewDto> GetOverviewAsync(CancellationToken ct = default);
}
