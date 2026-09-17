using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Payments;
using SkillBridge.Application.Interfaces.Payments;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Services.Payments;

public class SubscriptionService : ISubscriptionService
{
    private readonly SkillBridgeDbContext _dbContext;
    private readonly ILogger<SubscriptionService> _logger;

    public SubscriptionService(SkillBridgeDbContext dbContext, ILogger<SubscriptionService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task<SubscriptionResponseDto> PurchaseSubscriptionAsync(
        int userId,
        PurchaseSubscriptionRequest request,
        CancellationToken cancellationToken = default)
    {
        string planName;
        decimal amount;

        var normalizedPlan = request.PlanType?.Trim().ToUpperInvariant() ?? string.Empty;

        if (normalizedPlan == PaymentConstants.PlanEmpVip || normalizedPlan == "EMPLOYER_VIP" || normalizedPlan == "VIP" || normalizedPlan.Contains("VIP"))
        {
            planName = PaymentConstants.PlanNameEmpVip;
            amount = PaymentConstants.PriceEmpVip; // 149.000đ
        }
        else if (normalizedPlan == PaymentConstants.PlanEmpGrowth || normalizedPlan == "EMPLOYER_GROWTH" || normalizedPlan.Contains("GROWTH"))
        {
            planName = PaymentConstants.PlanNameEmpGrowth;
            amount = PaymentConstants.PriceEmpGrowth; // 89.000đ
        }
        else if (normalizedPlan == PaymentConstants.PlanEmpStarter || normalizedPlan == "EMPLOYER_STARTER")
        {
            planName = PaymentConstants.PlanNameEmpStarter;
            amount = PaymentConstants.PriceEmpStarter; // 49.000đ
        }
        else if (normalizedPlan == PaymentConstants.PlanStuMaster || normalizedPlan == "STUDENT_MASTER" || normalizedPlan == "MASTER" || normalizedPlan.Contains("MASTER"))
        {
            planName = PaymentConstants.PlanNameStuMaster;
            amount = PaymentConstants.PriceStuMaster; // 99.000đ
        }
        else if (normalizedPlan == PaymentConstants.PlanStuPro || normalizedPlan == "STUDENT_PRO" || normalizedPlan == "PRO" || normalizedPlan.Contains("PRO"))
        {
            planName = PaymentConstants.PlanNameStuPro;
            amount = PaymentConstants.PriceStuPro; // 49.000đ
        }
        else if (normalizedPlan == PaymentConstants.PlanStuStarter || normalizedPlan == "STUDENT_STARTER" || normalizedPlan.Contains("STARTER"))
        {
            planName = PaymentConstants.PlanNameStuStarter;
            amount = PaymentConstants.PriceStuStarter; // 29.000đ
        }
        else
        {
            throw new BusinessException($"Gói đăng ký '{request.PlanType}' không hợp lệ.");
        }

        if (_dbContext.Database.IsRelational())
        {
            var executionStrategy = _dbContext.Database.CreateExecutionStrategy();
            return await executionStrategy.ExecuteAsync(async () =>
            {
                await using var tx = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
                var result = await ExecutePurchaseInternalAsync(userId, planName, amount, cancellationToken);
                await tx.CommitAsync(cancellationToken);
                return result;
            });
        }

        return await ExecutePurchaseInternalAsync(userId, planName, amount, cancellationToken);
    }

    private async Task<SubscriptionResponseDto> ExecutePurchaseInternalAsync(
        int userId,
        string planName,
        decimal amount,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);

        // Kiểm tra hạ cấp: Nếu đang có gói cao hơn còn hạn, không cho phép mua gói thấp hơn
        var currentActiveSub = await _dbContext.Subscriptions
            .Where(s => s.UserId == userId 
                     && s.Status == PaymentConstants.ActiveSubscriptionStatus
                     && (s.RenewalDate == null || s.RenewalDate >= today))
            .OrderByDescending(s => s.UpdatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (currentActiveSub != null)
        {
            var currentRank = GetPlanTierRank(currentActiveSub.PlanName);
            var targetRank = GetPlanTierRank(planName);

            if (targetRank < currentRank)
            {
                throw new BusinessException(
                    $"Bạn đang sử dụng gói cao hơn ({currentActiveSub.PlanName}). Không thể mua gói thấp hơn ({planName}) khi gói hiện tại còn hạn sử dụng.");
            }
        }

        var wallet = await GetWalletWithLockAsync(userId, cancellationToken);
        if (wallet == null || wallet.Balance < amount)
        {
            var currentBalance = wallet?.Balance ?? 0m;
            throw new BusinessException(
                $"Số dư ví hiện tại ({currentBalance:N0}đ) không đủ để thanh toán gói {planName} ({amount:N0}đ). Vui lòng nạp thêm tiền vào ví.");
        }

        wallet.Balance -= amount;

        var transaction = new Transaction
        {
            UserId = userId,
            Type = "subscription",
            Label = $"Đăng ký gói {planName} (1 tháng)",
            Amount = amount,
            Sign = -1,
            CreatedAt = now
        };
        await _dbContext.Transactions.AddAsync(transaction, cancellationToken);

        var existingSameSub = currentActiveSub != null && currentActiveSub.PlanName == planName
            ? currentActiveSub
            : await _dbContext.Subscriptions
                .FirstOrDefaultAsync(s => s.UserId == userId && s.PlanName == planName && s.Status == "active", cancellationToken);


        Subscription sub;
        if (existingSameSub != null)
        {
            // Cùng gói: gia hạn thêm 1 tháng
            var baseDate = existingSameSub.RenewalDate.HasValue && existingSameSub.RenewalDate.Value > today
                ? existingSameSub.RenewalDate.Value
                : today;
            existingSameSub.RenewalDate = baseDate.AddMonths(1);
            existingSameSub.AmountPaid += amount;
            existingSameSub.UpdatedAt = now;
            sub = existingSameSub;
        }
        else
        {
            // Nâng cấp gói khác: hủy các gói active cũ để áp dụng gói mới ngay lập tức
            var otherActiveSubs = await _dbContext.Subscriptions
                .Where(s => s.UserId == userId && s.Status == "active")
                .ToListAsync(cancellationToken);
            foreach (var other in otherActiveSubs)
            {
                other.Status = PaymentConstants.CancelledSubscriptionStatus;
                other.UpdatedAt = now;
            }

            sub = new Subscription
            {
                UserId = userId,
                PlanName = planName,
                AmountPaid = amount,
                Status = "active",
                StartedAt = now,
                RenewalDate = today.AddMonths(1),
                UpdatedAt = now
            };
            await _dbContext.Subscriptions.AddAsync(sub, cancellationToken);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Người dùng {UserId} đã đăng ký thành công gói {PlanName} trị giá {Amount:N0}đ.", userId, planName, amount);

        return new SubscriptionResponseDto
        {
            Id = sub.Id,
            PlanName = sub.PlanName,
            AmountPaid = sub.AmountPaid,
            Status = sub.Status,
            StartedAt = sub.StartedAt,
            RenewalDate = sub.RenewalDate
        };
    }

    private async Task<Wallet?> GetWalletWithLockAsync(int userId, CancellationToken ct)
    {
        if (_dbContext.Database.IsRelational())
        {
            return await _dbContext.Wallets
                .FromSqlRaw("SELECT * FROM wallets WHERE user_id = {0} FOR UPDATE", userId)
                .SingleOrDefaultAsync(ct);
        }
        return await _dbContext.Wallets.FirstOrDefaultAsync(w => w.UserId == userId, ct);
    }

    public static int GetPlanTierRank(string? planName)
    {
        if (string.IsNullOrWhiteSpace(planName)) return 0;
        if (planName.Contains(PaymentConstants.MasterPlanKeyword, StringComparison.OrdinalIgnoreCase) ||
            planName.Contains(PaymentConstants.VipPlanKeyword, StringComparison.OrdinalIgnoreCase))
            return 3;
        if (planName.Contains(PaymentConstants.ProPlanKeyword, StringComparison.OrdinalIgnoreCase) ||
            planName.Contains(PaymentConstants.GrowthPlanKeyword, StringComparison.OrdinalIgnoreCase))
            return 2;
        if (planName.Contains(PaymentConstants.StarterPlanKeyword, StringComparison.OrdinalIgnoreCase))
            return 1;
        return 0;
    }
}

