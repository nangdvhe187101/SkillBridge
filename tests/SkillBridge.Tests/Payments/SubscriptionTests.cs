using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Payments;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Services.Payments;
using Xunit;

namespace SkillBridge.Tests.Payments;

public class SubscriptionTests
{
    private readonly Mock<ILogger<SubscriptionService>> _loggerMock = new();

    private SkillBridgeDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<SkillBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new SkillBridgeDbContext(options);
    }

    [Fact]
    public async Task PurchaseSubscription_InsufficientBalance_ShouldThrowBusinessException()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new SubscriptionService(dbContext, _loggerMock.Object);

        var userId = 1;
        dbContext.Wallets.Add(new Wallet { UserId = userId, Balance = 50000m });
        await dbContext.SaveChangesAsync();

        var request = new PurchaseSubscriptionRequest { PlanType = "EMP_VIP" }; // 149,000 VND

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.PurchaseSubscriptionAsync(userId, request));

        Assert.Contains("không đủ", ex.Message);
    }

    [Theory]
    [InlineData("EMP_STARTER", 49000, "Employer Starter")]
    [InlineData("EMP_GROWTH", 89000, "Employer Growth")]
    [InlineData("EMP_VIP", 149000, "VIP Business Suite")]
    [InlineData("STU_STARTER", 29000, "Student Starter")]
    [InlineData("STU_PRO", 49000, "Freelance Pro")]
    [InlineData("STU_MASTER", 99000, "Master Talent")]
    public async Task PurchaseSubscription_AllSixTiers_ShouldDeductCorrectBalanceAndCreateActiveSubscription(
        string planType, decimal expectedPrice, string expectedPlanName)
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new SubscriptionService(dbContext, _loggerMock.Object);

        var userId = 100;
        dbContext.Wallets.Add(new Wallet { UserId = userId, Balance = 500000m });
        await dbContext.SaveChangesAsync();

        var request = new PurchaseSubscriptionRequest { PlanType = planType };

        // Act
        var result = await service.PurchaseSubscriptionAsync(userId, request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(expectedPlanName, result.PlanName);
        Assert.Equal(expectedPrice, result.AmountPaid);
        Assert.Equal("active", result.Status);

        var updatedWallet = await dbContext.Wallets.FirstAsync(w => w.UserId == userId);
        Assert.Equal(500000m - expectedPrice, updatedWallet.Balance);

        var transaction = await dbContext.Transactions.FirstOrDefaultAsync(t => t.UserId == userId && t.Type == "subscription");
        Assert.NotNull(transaction);
        Assert.Equal(expectedPrice, transaction.Amount);
        Assert.Equal(-1, transaction.Sign);

        var sub = await dbContext.Subscriptions.FirstOrDefaultAsync(s => s.UserId == userId && s.Status == "active");
        Assert.NotNull(sub);
        Assert.Equal(expectedPlanName, sub.PlanName);
    }

    [Fact]
    public async Task PurchaseSubscription_SamePlanRenewal_ShouldExtendExistingRenewalDateByOneMonth()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new SubscriptionService(dbContext, _loggerMock.Object);

        var userId = 200;
        dbContext.Wallets.Add(new Wallet { UserId = userId, Balance = 300000m });

        var initialRenewalDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(20));
        dbContext.Subscriptions.Add(new Subscription
        {
            UserId = userId,
            PlanName = "Employer Starter",
            Status = "active",
            AmountPaid = 49000m,
            RenewalDate = initialRenewalDate,
            StartedAt = DateTime.UtcNow.AddDays(-10),
            UpdatedAt = DateTime.UtcNow.AddDays(-10)
        });
        await dbContext.SaveChangesAsync();

        var request = new PurchaseSubscriptionRequest { PlanType = "EMP_STARTER" };

        // Act
        var result = await service.PurchaseSubscriptionAsync(userId, request);

        // Assert
        Assert.NotNull(result);
        var expectedRenewal = initialRenewalDate.AddMonths(1);
        Assert.Equal(expectedRenewal, result.RenewalDate);

        var activeSubs = await dbContext.Subscriptions
            .Where(s => s.UserId == userId && s.Status == "active")
            .ToListAsync();
        Assert.Single(activeSubs);
        Assert.Equal(expectedRenewal, activeSubs[0].RenewalDate);
    }

    [Fact]
    public async Task PurchaseSubscription_UpgradeToHigherPlan_ShouldCancelOldPlanAndActivateNewPlan()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new SubscriptionService(dbContext, _loggerMock.Object);

        var userId = 300;
        dbContext.Wallets.Add(new Wallet { UserId = userId, Balance = 300000m });

        dbContext.Subscriptions.Add(new Subscription
        {
            UserId = userId,
            PlanName = "Student Starter",
            Status = "active",
            AmountPaid = 29000m,
            RenewalDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(15)),
            StartedAt = DateTime.UtcNow.AddDays(-15),
            UpdatedAt = DateTime.UtcNow.AddDays(-15)
        });
        await dbContext.SaveChangesAsync();

        var request = new PurchaseSubscriptionRequest { PlanType = "STU_MASTER" };

        // Act
        var result = await service.PurchaseSubscriptionAsync(userId, request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Master Talent", result.PlanName);
        Assert.Equal(99000m, result.AmountPaid);

        var oldSub = await dbContext.Subscriptions
            .FirstOrDefaultAsync(s => s.UserId == userId && s.PlanName == "Student Starter");
        Assert.NotNull(oldSub);
        Assert.Equal("cancelled", oldSub.Status);

        var newSub = await dbContext.Subscriptions
            .FirstOrDefaultAsync(s => s.UserId == userId && s.PlanName == "Master Talent" && s.Status == "active");
        Assert.NotNull(newSub);
    }

    [Fact]
    public async Task PurchaseSubscription_DowngradeToLowerPlan_ShouldThrowBusinessException()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new SubscriptionService(dbContext, _loggerMock.Object);

        var userId = 400;
        dbContext.Wallets.Add(new Wallet { UserId = userId, Balance = 500000m });

        dbContext.Subscriptions.Add(new Subscription
        {
            UserId = userId,
            PlanName = "Master Talent", // Rank 3
            Status = "active",
            AmountPaid = 99000m,
            RenewalDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(20)),
            StartedAt = DateTime.UtcNow.AddDays(-10),
            UpdatedAt = DateTime.UtcNow.AddDays(-10)
        });
        await dbContext.SaveChangesAsync();

        // Cố gắng hạ cấp về Student Starter (Rank 1)
        var request = new PurchaseSubscriptionRequest { PlanType = "STU_STARTER" };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.PurchaseSubscriptionAsync(userId, request));

        Assert.Contains("Không thể mua gói thấp hơn", ex.Message);

        // Đảm bảo không bị trừ tiền ví
        var wallet = await dbContext.Wallets.FirstAsync(w => w.UserId == userId);
        Assert.Equal(500000m, wallet.Balance);
    }
}

