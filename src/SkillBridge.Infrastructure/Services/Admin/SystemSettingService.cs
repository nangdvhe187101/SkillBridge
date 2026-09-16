using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Admin;
using SkillBridge.Application.DTOs.Jobs;
using SkillBridge.Application.Interfaces.Admin;
using SkillBridge.Application.Interfaces.Jobs;
using SkillBridge.Application.Interfaces.Payments;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Services.Admin;

public class SystemSettingService : ISystemSettingService
{
    private readonly SkillBridgeDbContext _dbContext;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SystemSettingService> _logger;

    public const string KeyAutoAcceptHours = "AutoAcceptHours";
    public const string KeyAutoCloseJobDays = "AutoCloseJobDays";
    public const string KeyFeaturedDurationHours = "FeaturedDurationHours";
    public const string KeyEmailJobHired = "Email_JobHired_Enabled";
    public const string KeyEmailDeliverable72h = "Email_Deliverable72h_Enabled";
    public const string KeyEmailPayout = "Email_Payout_Enabled";
    public const string KeyEmailDigest18h = "Email_Digest18h_Enabled";
    public const string KeyEmailVipMatch = "Email_VipMatch_Enabled";

    public SystemSettingService(
        SkillBridgeDbContext dbContext,
        IServiceScopeFactory scopeFactory,
        ILogger<SystemSettingService> logger)
    {
        _dbContext = dbContext;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task<SystemSettingsResponseDto> GetSettingsAsync(CancellationToken cancellationToken = default)
    {
        var list = await _dbContext.SystemSettings.AsNoTracking().ToListAsync(cancellationToken);
        var dict = list.ToDictionary(s => s.Key, s => s.Value, StringComparer.OrdinalIgnoreCase);

        return new SystemSettingsResponseDto
        {
            AutoAcceptHours = GetIntFromDict(dict, KeyAutoAcceptHours, 72),
            AutoCloseJobDays = GetIntFromDict(dict, KeyAutoCloseJobDays, 30),
            FeaturedDurationHours = GetIntFromDict(dict, KeyFeaturedDurationHours, 48),
            EmailJobHiredEnabled = GetBoolFromDict(dict, KeyEmailJobHired, true),
            EmailDeliverable72hEnabled = GetBoolFromDict(dict, KeyEmailDeliverable72h, true),
            EmailPayoutEnabled = GetBoolFromDict(dict, KeyEmailPayout, true),
            EmailDigest18hEnabled = GetBoolFromDict(dict, KeyEmailDigest18h, true),
            EmailVipMatchEnabled = GetBoolFromDict(dict, KeyEmailVipMatch, true),
            RawSettings = dict
        };
    }

    public async Task<SystemSettingsResponseDto> UpdateSettingsAsync(UpdateSystemSettingsRequest request, CancellationToken cancellationToken = default)
    {
        if (request.AutoAcceptHours.HasValue)
            await UpsertSettingAsync(KeyAutoAcceptHours, request.AutoAcceptHours.Value.ToString(), "Số giờ tự động nghiệm thu sau khi nộp bài", cancellationToken);

        if (request.AutoCloseJobDays.HasValue)
            await UpsertSettingAsync(KeyAutoCloseJobDays, request.AutoCloseJobDays.Value.ToString(), "Số ngày tự động đóng công việc cũ", cancellationToken);

        if (request.FeaturedDurationHours.HasValue)
            await UpsertSettingAsync(KeyFeaturedDurationHours, request.FeaturedDurationHours.Value.ToString(), "Thời gian ghim tin nổi bật (giờ)", cancellationToken);

        if (request.EmailJobHiredEnabled.HasValue)
            await UpsertSettingAsync(KeyEmailJobHired, request.EmailJobHiredEnabled.Value.ToString().ToLowerInvariant(), "Bật/tắt email chúc mừng sinh viên trúng tuyển", cancellationToken);

        if (request.EmailDeliverable72hEnabled.HasValue)
            await UpsertSettingAsync(KeyEmailDeliverable72h, request.EmailDeliverable72hEnabled.Value.ToString().ToLowerInvariant(), "Bật/tắt email gửi NTD khi sinh viên nộp bài (nhắc 72h)", cancellationToken);

        if (request.EmailPayoutEnabled.HasValue)
            await UpsertSettingAsync(KeyEmailPayout, request.EmailPayoutEnabled.Value.ToString().ToLowerInvariant(), "Bật/tắt email thông báo giải ngân thù lao thành công", cancellationToken);

        if (request.EmailDigest18hEnabled.HasValue)
            await UpsertSettingAsync(KeyEmailDigest18h, request.EmailDigest18hEnabled.Value.ToString().ToLowerInvariant(), "Bật/tắt email báo cáo tổng hợp ứng viên lúc 18h cho NTD", cancellationToken);

        if (request.EmailVipMatchEnabled.HasValue)
            await UpsertSettingAsync(KeyEmailVipMatch, request.EmailVipMatchEnabled.Value.ToString().ToLowerInvariant(), "Bật/tắt email cảnh báo việc làm mới cho sinh viên VIP/Master", cancellationToken);

        if (request.AdditionalSettings != null)
        {
            foreach (var kvp in request.AdditionalSettings)
            {
                await UpsertSettingAsync(kvp.Key, kvp.Value, null, cancellationToken);
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Quản trị viên đã cập nhật cấu hình hệ thống SystemSettings.");

        return await GetSettingsAsync(cancellationToken);
    }

    public async Task<bool> IsFeatureEnabledAsync(string settingKey, bool defaultValue = true, CancellationToken cancellationToken = default)
    {
        var setting = await _dbContext.SystemSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Key == settingKey, cancellationToken);

        if (setting == null) return defaultValue;
        return bool.TryParse(setting.Value, out var val) ? val : defaultValue;
    }

    public async Task<int> GetIntSettingAsync(string settingKey, int defaultValue, CancellationToken cancellationToken = default)
    {
        var setting = await _dbContext.SystemSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Key == settingKey, cancellationToken);

        if (setting == null) return defaultValue;
        return int.TryParse(setting.Value, out var val) ? val : defaultValue;
    }

    public async Task<TriggerActionResultDto> TriggerAutoAcceptScanAsync(CancellationToken cancellationToken = default)
    {
        var autoAcceptHours = await GetIntSettingAsync(KeyAutoAcceptHours, 72, cancellationToken);
        var threshold = DateTime.UtcNow.AddHours(-autoAcceptHours);

        var eligibleDeliverables = await _dbContext.JobDeliverables
            .Include(d => d.Job)
            .Where(d => d.Status == "submitted" && d.SubmittedAt <= threshold && d.Job.Status == "submitted")
            .ToListAsync(cancellationToken);

        int processed = 0;
        using var scope = _scopeFactory.CreateScope();
        var deliverableService = scope.ServiceProvider.GetRequiredService<IDeliverableService>();

        foreach (var d in eligibleDeliverables)
        {
            try
            {
                await deliverableService.ReviewDeliverableAsync(
                    d.Job.EmployerId,
                    d.JobId,
                    d.Id,
                    new ReviewDeliverableRequest
                    {
                        Status = "accepted",
                        FeedbackComment = $"Hệ thống tự động nghiệm thu sau {autoAcceptHours} giờ không có khiếu nại từ Nhà tuyển dụng."
                    },
                    cancellationToken);
                processed++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tự động nghiệm thu deliverable {DeliverableId} của Job {JobId}.", d.Id, d.JobId);
            }
        }

        return new TriggerActionResultDto
        {
            Success = true,
            AffectedCount = processed,
            Message = $"Đã quét và tự động nghiệm thu thành công {processed} sản phẩm bàn giao quá hạn {autoAcceptHours} giờ.",
            ExecutedAt = DateTime.UtcNow
        };
    }

    public async Task<TriggerActionResultDto> TriggerPaymentReconciliationAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;

        // 1. Quét các đơn nạp tiền đã quá hạn mà còn pending
        var expiredOrders = await _dbContext.PaymentOrders
            .Where(o => o.Status == "pending" && o.ExpiresAt.HasValue && o.ExpiresAt.Value < now)
            .ExecuteUpdateAsync(s => s.SetProperty(o => o.Status, "expired"), cancellationToken);

        // 2. Quét các gói VIP/PRO đã quá hạn RenewalDate
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var expiredSubs = await _dbContext.Subscriptions
            .Where(s => s.Status == PaymentConstants.ActiveSubscriptionStatus && s.RenewalDate != null && s.RenewalDate.Value < today)
            .ExecuteUpdateAsync(s => s
                .SetProperty(sub => sub.Status, PaymentConstants.CancelledSubscriptionStatus)
                .SetProperty(sub => sub.UpdatedAt, DateTime.UtcNow), cancellationToken);

        return new TriggerActionResultDto
        {
            Success = true,
            AffectedCount = expiredOrders + expiredSubs,
            Message = $"Đối soát hoàn tất: Đã chuyển {expiredOrders} đơn hết hạn thành 'expired' và {expiredSubs} gói hết hạn thành 'cancelled'.",
            ExecutedAt = DateTime.UtcNow
        };
    }

    private async Task UpsertSettingAsync(string key, string value, string? description, CancellationToken ct)
    {
        var existing = await _dbContext.SystemSettings.FirstOrDefaultAsync(s => s.Key == key, ct);
        if (existing != null)
        {
            existing.Value = value;
            if (!string.IsNullOrWhiteSpace(description)) existing.Description = description;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            await _dbContext.SystemSettings.AddAsync(new SystemSetting
            {
                Key = key,
                Value = value,
                Description = description,
                UpdatedAt = DateTime.UtcNow
            }, ct);
        }
    }

    private static int GetIntFromDict(Dictionary<string, string> dict, string key, int fallback)
    {
        if (dict.TryGetValue(key, out var str) && int.TryParse(str, out var v)) return v;
        return fallback;
    }

    private static bool GetBoolFromDict(Dictionary<string, string> dict, string key, bool fallback)
    {
        if (dict.TryGetValue(key, out var str) && bool.TryParse(str, out var v)) return v;
        return fallback;
    }
}
