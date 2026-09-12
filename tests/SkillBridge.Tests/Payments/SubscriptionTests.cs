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

        var request = new PurchaseSubscriptionRequest { PlanType = "VIP" }; // 199,000 VND

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.PurchaseSubscriptionAsync(userId, request));

        Assert.Contains("không đủ", ex.Message);
    }

    [Fact]
    public async Task PurchaseSubscription_SufficientBalance_ShouldDeductBalanceAndCreateSubscription()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new SubscriptionService(dbContext, _loggerMock.Object);

        var userId = 2;
        dbContext.Wallets.Add(new Wallet { UserId = userId, Balance = 300000m });
        await dbContext.SaveChangesAsync();

        var request = new PurchaseSubscriptionRequest { PlanType = "VIP" };

        // Act
        var result = await service.PurchaseSubscriptionAsync(userId, request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("VIP Business Suite", result.PlanName);
        Assert.Equal(199000m, result.AmountPaid);
        Assert.Equal("active", result.Status);

        var updatedWallet = await dbContext.Wallets.FirstAsync(w => w.UserId == userId);
        Assert.Equal(101000m, updatedWallet.Balance); // 300,000 - 199,000 = 101,000

        var transaction = await dbContext.Transactions.FirstOrDefaultAsync(t => t.UserId == userId && t.Type == "subscription");
        Assert.NotNull(transaction);
        Assert.Equal(199000m, transaction.Amount);
        Assert.Equal(-1, transaction.Sign);

        var sub = await dbContext.Subscriptions.FirstOrDefaultAsync(s => s.UserId == userId && s.Status == "active");
        Assert.NotNull(sub);
        Assert.Equal("VIP Business Suite", sub.PlanName);
    }
}
