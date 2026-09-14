using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Admin;

namespace SkillBridge.Application.Interfaces.Admin;

public interface ISystemSettingService
{
    Task<SystemSettingsResponseDto> GetSettingsAsync(CancellationToken cancellationToken = default);
    Task<SystemSettingsResponseDto> UpdateSettingsAsync(UpdateSystemSettingsRequest request, CancellationToken cancellationToken = default);
    Task<bool> IsFeatureEnabledAsync(string settingKey, bool defaultValue = true, CancellationToken cancellationToken = default);
    Task<int> GetIntSettingAsync(string settingKey, int defaultValue, CancellationToken cancellationToken = default);
    Task<TriggerActionResultDto> TriggerAutoAcceptScanAsync(CancellationToken cancellationToken = default);
    Task<TriggerActionResultDto> TriggerPaymentReconciliationAsync(CancellationToken cancellationToken = default);
}
