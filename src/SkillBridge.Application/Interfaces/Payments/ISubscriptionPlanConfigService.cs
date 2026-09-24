using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Payments;

namespace SkillBridge.Application.Interfaces.Payments;

public interface ISubscriptionPlanConfigService
{
    Task<PublicPlansGroupDto> GetPublicPlansAsync(CancellationToken ct = default);
    Task<List<SubscriptionPlanConfigDto>> GetAllPlansForAdminAsync(CancellationToken ct = default);
    Task<SubscriptionPlanConfigDto> GetPlanByIdAsync(int id, CancellationToken ct = default);
    Task<SubscriptionPlanConfigDto> GetPlanByCodeAsync(string code, CancellationToken ct = default);
    Task<SubscriptionPlanConfigDto> UpdatePlanAsync(int id, UpdateSubscriptionPlanConfigRequest request, CancellationToken ct = default);
    Task<bool> TogglePlanActiveAsync(int id, CancellationToken ct = default);
    Task<decimal> GetEffectiveCommissionRateAsync(int userId, CancellationToken ct = default);
    Task<int?> GetMaxActiveJobsAsync(int employerId, CancellationToken ct = default);
    Task<int?> GetMaxWeeklyApplicationsAsync(int studentId, CancellationToken ct = default);
    Task<int> GetMaxCvFilesAsync(int studentId, CancellationToken ct = default);
    Task<int> GetAllowedRevisionLimitAsync(int employerId, int defaultCategoryLimit, CancellationToken ct = default);
}
