using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Payments;
using SkillBridge.Application.Interfaces.Payments;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Services.Payments;

public class SubscriptionPlanConfigService : ISubscriptionPlanConfigService
{
    private const string CacheKeyAllPlans = "SkillBridge_Subscription_Plans_All";
    private readonly SkillBridgeDbContext _dbContext;
    private readonly IMemoryCache? _cache;
    private readonly ILogger<SubscriptionPlanConfigService> _logger;

    public SubscriptionPlanConfigService(
        SkillBridgeDbContext dbContext,
        ILogger<SubscriptionPlanConfigService> logger,
        IMemoryCache? cache = null)
    {
        _dbContext = dbContext;
        _logger = logger;
        _cache = cache;
    }

    private void InvalidateCache()
    {
        _cache?.Remove(CacheKeyAllPlans);
    }

    private async Task<List<SubscriptionPlanConfig>> GetCachedPlansAsync(CancellationToken ct = default)
    {
        if (_cache != null && _cache.TryGetValue(CacheKeyAllPlans, out List<SubscriptionPlanConfig>? cached) && cached != null)
        {
            return cached;
        }

        var list = await _dbContext.SubscriptionPlanConfigs.AsNoTracking().ToListAsync(ct);
        if (_cache != null && list.Count > 0)
        {
            _cache.Set(CacheKeyAllPlans, list, TimeSpan.FromMinutes(10));
        }
        return list;
    }

    public async Task<PublicPlansGroupDto> GetPublicPlansAsync(CancellationToken ct = default)
    {
        var all = await GetCachedPlansAsync(ct);
        var active = all.Where(p => p.IsActive).OrderBy(p => p.TierRank).ThenBy(p => p.Price).ToList();

        return new PublicPlansGroupDto
        {
            StudentPlans = active.Where(p => p.TargetRole == "student").Select(MapToDto).ToList(),
            EmployerPlans = active.Where(p => p.TargetRole == "employer").Select(MapToDto).ToList()
        };
    }

    public async Task<List<SubscriptionPlanConfigDto>> GetAllPlansForAdminAsync(CancellationToken ct = default)
    {
        var all = await _dbContext.SubscriptionPlanConfigs
            .AsNoTracking()
            .OrderBy(p => p.TargetRole)
            .ThenBy(p => p.TierRank)
            .ToListAsync(ct);

        return all.Select(MapToDto).ToList();
    }

    public async Task<SubscriptionPlanConfigDto> GetPlanByIdAsync(int id, CancellationToken ct = default)
    {
        var entity = await _dbContext.SubscriptionPlanConfigs.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id, ct);
        if (entity == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy cấu hình gói dịch vụ #{id}.");
        }
        return MapToDto(entity);
    }

    public async Task<SubscriptionPlanConfigDto> GetPlanByCodeAsync(string code, CancellationToken ct = default)
    {
        var all = await GetCachedPlansAsync(ct);
        var normalized = code.Trim().ToUpperInvariant();
        var entity = all.FirstOrDefault(p => p.Code.Equals(normalized, StringComparison.OrdinalIgnoreCase));
        if (entity == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy cấu hình gói dịch vụ với mã '{code}'.");
        }
        return MapToDto(entity);
    }

    public async Task<SubscriptionPlanConfigDto> UpdatePlanAsync(int id, UpdateSubscriptionPlanConfigRequest request, CancellationToken ct = default)
    {
        var entity = await _dbContext.SubscriptionPlanConfigs.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (entity == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy cấu hình gói dịch vụ #{id}.");
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new BusinessException("Tên gói dịch vụ không được để trống.");
        }

        if (request.Price < 0)
        {
            throw new BusinessException("Giá gói dịch vụ không thể là số âm.");
        }

        if (request.CommissionRate < 0 || request.CommissionRate > 1)
        {
            throw new BusinessException("Tỷ lệ hoa hồng nền tảng phải nằm trong khoảng từ 0 (0%) đến 1 (100%).");
        }

        entity.Name = request.Name.Trim();
        entity.Tagline = string.IsNullOrWhiteSpace(request.Tagline) ? null : request.Tagline.Trim();
        entity.BadgeText = string.IsNullOrWhiteSpace(request.BadgeText) ? null : request.BadgeText.Trim();
        entity.Price = request.Price;
        entity.PriceSub = string.IsNullOrWhiteSpace(request.PriceSub) ? null : request.PriceSub.Trim();
        entity.CommissionRate = request.CommissionRate;

        if (request.TierRank.HasValue && request.TierRank.Value >= 0) entity.TierRank = request.TierRank.Value;
        if (request.MaxActiveJobs.HasValue) entity.MaxActiveJobs = request.MaxActiveJobs.Value;
        if (request.MaxWeeklyApplications.HasValue) entity.MaxWeeklyApplications = request.MaxWeeklyApplications.Value;
        if (request.MaxCvFiles.HasValue && request.MaxCvFiles.Value > 0) entity.MaxCvFiles = request.MaxCvFiles.Value;
        if (request.DefaultRevisionLimit.HasValue && request.DefaultRevisionLimit.Value >= 0) entity.DefaultRevisionLimit = request.DefaultRevisionLimit.Value;
        if (request.FreeFeaturedPins.HasValue && request.FreeFeaturedPins.Value >= 0) entity.FreeFeaturedPins = request.FreeFeaturedPins.Value;
        if (request.FreeDirectInvites.HasValue && request.FreeDirectInvites.Value >= 0) entity.FreeDirectInvites = request.FreeDirectInvites.Value;

        if (request.Features != null)
        {
            entity.FeaturesJson = JsonSerializer.Serialize(request.Features);
        }

        if (request.IsActive.HasValue) entity.IsActive = request.IsActive.Value;
        if (request.IsPopular.HasValue) entity.IsPopular = request.IsPopular.Value;

        entity.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(ct);
        InvalidateCache();

        _logger.LogInformation("Quản trị viên đã cập nhật thành công gói dịch vụ #{Id} ({Code}): Giá={Price:N0}đ, Phí sàn={Rate:P1}",
            entity.Id, entity.Code, entity.Price, entity.CommissionRate);

        return MapToDto(entity);
    }

    public async Task<SubscriptionPlanConfigDto> CreatePlanAsync(CreateSubscriptionPlanConfigRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Code))
            throw new BusinessException("Mã gói dịch vụ (Code) không được để trống.");

        var normalizedCode = request.Code.Trim().ToUpperInvariant();
        if (!System.Text.RegularExpressions.Regex.IsMatch(normalizedCode, "^[A-Z0-9_]{3,50}$"))
            throw new BusinessException("Mã gói chỉ được chứa chữ cái in hoa, số và dấu gạch dưới (VD: EMP_ENTERPRISE), độ dài từ 3-50 ký tự.");

        var exists = await _dbContext.SubscriptionPlanConfigs.AnyAsync(p => p.Code == normalizedCode, ct);
        if (exists)
            throw new BusinessException($"Mã gói '{normalizedCode}' đã tồn tại trong hệ thống. Vui lòng chọn mã khác.");

        var role = request.TargetRole?.Trim().ToLowerInvariant();
        if (role != "student" && role != "employer")
            throw new BusinessException("Đối tượng áp dụng (TargetRole) chỉ có thể là 'student' hoặc 'employer'.");

        if (string.IsNullOrWhiteSpace(request.Name))
            throw new BusinessException("Tên gói dịch vụ không được để trống.");

        if (request.Price < 0)
            throw new BusinessException("Giá gói dịch vụ không thể là số âm.");

        if (request.CommissionRate < 0 || request.CommissionRate > 1)
            throw new BusinessException("Tỷ lệ hoa hồng nền tảng phải nằm trong khoảng từ 0 (0%) đến 1 (100%).");

        var entity = new SubscriptionPlanConfig
        {
            Code = normalizedCode,
            TargetRole = role,
            Name = request.Name.Trim(),
            Tagline = string.IsNullOrWhiteSpace(request.Tagline) ? null : request.Tagline.Trim(),
            BadgeText = string.IsNullOrWhiteSpace(request.BadgeText) ? null : request.BadgeText.Trim(),
            Price = request.Price,
            PriceSub = string.IsNullOrWhiteSpace(request.PriceSub) ? null : request.PriceSub.Trim(),
            CommissionRate = request.CommissionRate,
            TierRank = request.TierRank >= 0 ? request.TierRank : 1,
            MaxActiveJobs = request.MaxActiveJobs,
            MaxWeeklyApplications = request.MaxWeeklyApplications,
            MaxCvFiles = request.MaxCvFiles > 0 ? request.MaxCvFiles : 5,
            DefaultRevisionLimit = request.DefaultRevisionLimit >= 0 ? request.DefaultRevisionLimit : 2,
            FreeFeaturedPins = request.FreeFeaturedPins >= 0 ? request.FreeFeaturedPins : 0,
            FreeDirectInvites = request.FreeDirectInvites >= 0 ? request.FreeDirectInvites : 0,
            FeaturesJson = JsonSerializer.Serialize(request.Features ?? new List<string>()),
            IsActive = request.IsActive,
            IsPopular = request.IsPopular,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _dbContext.SubscriptionPlanConfigs.AddAsync(entity, ct);
        await _dbContext.SaveChangesAsync(ct);
        InvalidateCache();

        _logger.LogInformation("Quản trị viên đã tạo mới thành công gói dịch vụ #{Id} ({Code}): {Name}, Giá={Price:N0}đ",
            entity.Id, entity.Code, entity.Name, entity.Price);

        return MapToDto(entity);
    }

    public async Task DeletePlanAsync(int id, CancellationToken ct = default)
    {
        var entity = await _dbContext.SubscriptionPlanConfigs.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (entity == null)
            throw new KeyNotFoundException($"Không tìm thấy cấu hình gói dịch vụ #{id}.");

        if (entity.Code == "FREE_STUDENT" || entity.Code == "FREE_EMPLOYER")
            throw new BusinessException("Không thể xóa gói miễn phí mặc định của hệ thống.");

        _dbContext.SubscriptionPlanConfigs.Remove(entity);
        await _dbContext.SaveChangesAsync(ct);
        InvalidateCache();

        _logger.LogInformation("Quản trị viên đã xóa gói dịch vụ #{Id} ({Code}): {Name}", entity.Id, entity.Code, entity.Name);
    }

    public async Task<bool> TogglePlanActiveAsync(int id, CancellationToken ct = default)
    {
        var entity = await _dbContext.SubscriptionPlanConfigs.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (entity == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy cấu hình gói dịch vụ #{id}.");
        }

        entity.IsActive = !entity.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(ct);
        InvalidateCache();

        _logger.LogInformation("Quản trị viên đã chuyển trạng thái gói #{Id} ({Code}) sang: {Status}",
            entity.Id, entity.Code, entity.IsActive ? "ACTIVE" : "INACTIVE");

        return entity.IsActive;
    }

    public async Task<decimal> GetEffectiveCommissionRateAsync(int userId, CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var activeSub = await _dbContext.Subscriptions
            .AsNoTracking()
            .Where(s => s.UserId == userId 
                     && s.Status == PaymentConstants.ActiveSubscriptionStatus
                     && (s.RenewalDate == null || s.RenewalDate >= today))
            .OrderByDescending(s => s.UpdatedAt)
            .FirstOrDefaultAsync(ct);

        if (activeSub == null)
        {
            // Kiểm tra gói FREE mặc định trong DB
            var freePlan = (await GetCachedPlansAsync(ct)).FirstOrDefault(p => p.Code.StartsWith("FREE"));
            return freePlan?.CommissionRate ?? PaymentConstants.DefaultCommissionRate; // 10%
        }

        var allPlans = await GetCachedPlansAsync(ct);
        var match = allPlans.FirstOrDefault(p =>
            p.Name.Equals(activeSub.PlanName, StringComparison.OrdinalIgnoreCase) ||
            p.Code.Equals(activeSub.PlanName, StringComparison.OrdinalIgnoreCase) ||
            activeSub.PlanName.Contains(p.Code, StringComparison.OrdinalIgnoreCase));

        return match?.CommissionRate ?? PaymentConstants.DefaultCommissionRate;
    }

    public async Task<int?> GetMaxActiveJobsAsync(int employerId, CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var activeSub = await _dbContext.Subscriptions
            .AsNoTracking()
            .Where(s => s.UserId == employerId 
                     && s.Status == PaymentConstants.ActiveSubscriptionStatus
                     && (s.RenewalDate == null || s.RenewalDate >= today))
            .OrderByDescending(s => s.UpdatedAt)
            .FirstOrDefaultAsync(ct);

        var allPlans = await GetCachedPlansAsync(ct);
        if (activeSub == null)
        {
            var freeEmp = allPlans.FirstOrDefault(p => p.Code == "FREE_EMPLOYER" || (p.TargetRole == "employer" && p.TierRank == 0));
            return freeEmp?.MaxActiveJobs ?? 1;
        }

        var match = allPlans.FirstOrDefault(p =>
            p.Name.Equals(activeSub.PlanName, StringComparison.OrdinalIgnoreCase) ||
            p.Code.Equals(activeSub.PlanName, StringComparison.OrdinalIgnoreCase) ||
            activeSub.PlanName.Contains(p.Code, StringComparison.OrdinalIgnoreCase));

        return match?.MaxActiveJobs; // null = Unlimited
    }

    public async Task<int?> GetMaxWeeklyApplicationsAsync(int studentId, CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var activeSub = await _dbContext.Subscriptions
            .AsNoTracking()
            .Where(s => s.UserId == studentId 
                     && s.Status == PaymentConstants.ActiveSubscriptionStatus
                     && (s.RenewalDate == null || s.RenewalDate >= today))
            .OrderByDescending(s => s.UpdatedAt)
            .FirstOrDefaultAsync(ct);

        var allPlans = await GetCachedPlansAsync(ct);
        if (activeSub == null)
        {
            var freeStu = allPlans.FirstOrDefault(p => p.Code == "FREE_STUDENT" || (p.TargetRole == "student" && p.TierRank == 0));
            return freeStu?.MaxWeeklyApplications ?? 5;
        }

        var match = allPlans.FirstOrDefault(p =>
            p.Name.Equals(activeSub.PlanName, StringComparison.OrdinalIgnoreCase) ||
            p.Code.Equals(activeSub.PlanName, StringComparison.OrdinalIgnoreCase) ||
            activeSub.PlanName.Contains(p.Code, StringComparison.OrdinalIgnoreCase));

        return match?.MaxWeeklyApplications; // null = Unlimited
    }

    public async Task<int> GetMaxCvFilesAsync(int studentId, CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var activeSub = await _dbContext.Subscriptions
            .AsNoTracking()
            .Where(s => s.UserId == studentId 
                     && s.Status == PaymentConstants.ActiveSubscriptionStatus
                     && (s.RenewalDate == null || s.RenewalDate >= today))
            .OrderByDescending(s => s.UpdatedAt)
            .FirstOrDefaultAsync(ct);

        var allPlans = await GetCachedPlansAsync(ct);
        if (activeSub == null)
        {
            var freeStu = allPlans.FirstOrDefault(p => p.Code == "FREE_STUDENT" || (p.TargetRole == "student" && p.TierRank == 0));
            return freeStu?.MaxCvFiles ?? 1;
        }

        var match = allPlans.FirstOrDefault(p =>
            p.Name.Equals(activeSub.PlanName, StringComparison.OrdinalIgnoreCase) ||
            p.Code.Equals(activeSub.PlanName, StringComparison.OrdinalIgnoreCase) ||
            activeSub.PlanName.Contains(p.Code, StringComparison.OrdinalIgnoreCase));

        return match?.MaxCvFiles ?? 5;
    }

    public async Task<int> GetAllowedRevisionLimitAsync(int employerId, int defaultCategoryLimit, CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var activeSub = await _dbContext.Subscriptions
            .AsNoTracking()
            .Where(s => s.UserId == employerId 
                     && s.Status == PaymentConstants.ActiveSubscriptionStatus
                     && (s.RenewalDate == null || s.RenewalDate >= today))
            .OrderByDescending(s => s.UpdatedAt)
            .FirstOrDefaultAsync(ct);

        var allPlans = await GetCachedPlansAsync(ct);
        if (activeSub == null)
        {
            var freeEmp = allPlans.FirstOrDefault(p => p.Code == "FREE_EMPLOYER" || (p.TargetRole == "employer" && p.TierRank == 0));
            return freeEmp?.DefaultRevisionLimit ?? defaultCategoryLimit;
        }

        var match = allPlans.FirstOrDefault(p =>
            p.Name.Equals(activeSub.PlanName, StringComparison.OrdinalIgnoreCase) ||
            p.Code.Equals(activeSub.PlanName, StringComparison.OrdinalIgnoreCase) ||
            activeSub.PlanName.Contains(p.Code, StringComparison.OrdinalIgnoreCase));

        return match?.DefaultRevisionLimit ?? defaultCategoryLimit;
    }

    private static SubscriptionPlanConfigDto MapToDto(SubscriptionPlanConfig p)
    {
        List<string> features = new();
        if (!string.IsNullOrWhiteSpace(p.FeaturesJson))
        {
            try
            {
                features = JsonSerializer.Deserialize<List<string>>(p.FeaturesJson) ?? new();
            }
            catch
            {
                features = new() { p.FeaturesJson };
            }
        }

        return new SubscriptionPlanConfigDto
        {
            Id = p.Id,
            Code = p.Code,
            TargetRole = p.TargetRole,
            Name = p.Name,
            Tagline = p.Tagline,
            BadgeText = p.BadgeText,
            Price = p.Price,
            PriceSub = p.PriceSub,
            CommissionRate = p.CommissionRate,
            TierRank = p.TierRank,
            MaxActiveJobs = p.MaxActiveJobs,
            MaxWeeklyApplications = p.MaxWeeklyApplications,
            MaxCvFiles = p.MaxCvFiles,
            DefaultRevisionLimit = p.DefaultRevisionLimit,
            FreeFeaturedPins = p.FreeFeaturedPins,
            FreeDirectInvites = p.FreeDirectInvites,
            Features = features,
            IsActive = p.IsActive,
            IsPopular = p.IsPopular,
            UpdatedAt = p.UpdatedAt
        };
    }
}
