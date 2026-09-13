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
        if (normalizedPlan == PaymentConstants.VipPlanKeyword || normalizedPlan.Contains(PaymentConstants.VipPlanKeyword))
        {
            planName = "VIP Business Suite";
            amount = 199000m;
        }
        else if (normalizedPlan == "PRO" || normalizedPlan.Contains("PRO"))
        {
            planName = "Freelance Pro";
            amount = 49000m;
        }
        else
        {
            throw new BusinessException("Gói đăng ký không hợp lệ. Hỗ trợ gói 'VIP' hoặc 'PRO'.");
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
            CreatedAt = DateTime.UtcNow
        };
        await _dbContext.Transactions.AddAsync(transaction, cancellationToken);

        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);

        var sub = await _dbContext.Subscriptions
            .FirstOrDefaultAsync(s => s.UserId == userId && s.PlanName == planName && s.Status == "active", cancellationToken);

        if (sub != null)
        {
            var baseDate = sub.RenewalDate.HasValue && sub.RenewalDate.Value > today
                ? sub.RenewalDate.Value
                : today;
            sub.RenewalDate = baseDate.AddMonths(1);
            sub.AmountPaid += amount;
            sub.UpdatedAt = now;
        }
        else
        {
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
}
