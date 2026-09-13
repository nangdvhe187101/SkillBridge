using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using SkillBridge.Application.Common;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Services.Payments;
using Xunit;

namespace SkillBridge.Tests.Payments;

public class EscrowPaymentTests
{
    private readonly Mock<ILogger<EscrowPaymentService>> _loggerMock = new();

    private SkillBridgeDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<SkillBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new SkillBridgeDbContext(options);
    }

    [Fact]
    public async Task ReleaseEscrowAsync_NormalEmployer_ShouldDeduct10PercentCommission_AndCreditStudentWallet()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new EscrowPaymentService(dbContext, _loggerMock.Object);

        var employerId = 1;
        var studentId = 2;
        var jobId = 101;
        var jobBudget = 500000m;

        // Act
        await service.ReleaseEscrowAsync(studentId, employerId, jobId, "Thiết kế Website", jobBudget);
        await dbContext.SaveChangesAsync();

        // Assert
        var studentWallet = await dbContext.Wallets.FirstOrDefaultAsync(w => w.UserId == studentId);
        Assert.NotNull(studentWallet);
        Assert.Equal(450000m, studentWallet.Balance); // 500,000 - 10% (50,000) = 450,000

        var receipt = await dbContext.Receipts.FirstOrDefaultAsync(r => r.JobId == jobId);
        Assert.NotNull(receipt);
        Assert.Equal(500000m, receipt.Budget);
        Assert.Equal(50000m, receipt.Commission);
        Assert.Equal(500000m, receipt.Total); // Contract Gross total = Budget

        var txs = await dbContext.Transactions.Where(t => t.UserId == studentId).ToListAsync();
        Assert.Equal(2, txs.Count);

        var releaseTx = txs.FirstOrDefault(t => t.Type == "escrow_release");
        Assert.NotNull(releaseTx);
        Assert.Equal(450000m, releaseTx.Amount);
        Assert.Equal(1, releaseTx.Sign);

        var commissionTx = txs.FirstOrDefault(t => t.Type == "commission");
        Assert.NotNull(commissionTx);
        Assert.Equal(50000m, commissionTx.Amount);
        Assert.Equal(-1, commissionTx.Sign);
    }

    [Fact]
    public async Task ReleaseEscrowAsync_VipEmployer_ShouldDeduct5PercentCommission()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new EscrowPaymentService(dbContext, _loggerMock.Object);

        var employerId = 10;
        var studentId = 20;
        var jobId = 202;
        var jobBudget = 1000000m;

        // Employer has active VIP subscription
        dbContext.Subscriptions.Add(new Subscription
        {
            UserId = employerId,
            PlanName = "VIP Business Suite",
            Status = "active",
            AmountPaid = 299000m,
            StartedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        await dbContext.SaveChangesAsync();

        // Act
        await service.ReleaseEscrowAsync(studentId, employerId, jobId, "Xây dựng AI App", jobBudget);
        await dbContext.SaveChangesAsync();

        // Assert
        var studentWallet = await dbContext.Wallets.FirstOrDefaultAsync(w => w.UserId == studentId);
        Assert.NotNull(studentWallet);
        Assert.Equal(950000m, studentWallet.Balance); // 1,000,000 - 5% (50,000) = 950,000

        var receipt = await dbContext.Receipts.FirstOrDefaultAsync(r => r.JobId == jobId);
        Assert.NotNull(receipt);
        Assert.Equal(1000000m, receipt.Budget);
        Assert.Equal(50000m, receipt.Commission);
        Assert.Equal(1000000m, receipt.Total);
    }

    [Fact]
    public async Task ReleaseEscrowAsync_ExpiredVipSubscription_ShouldChargeStandard10PercentCommission()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new EscrowPaymentService(dbContext, _loggerMock.Object);

        var employerId = 15;
        var studentId = 25;
        var jobId = 205;
        var jobBudget = 1000000m;

        // Employer has VIP subscription BUT it expired yesterday
        dbContext.Subscriptions.Add(new Subscription
        {
            UserId = employerId,
            PlanName = "VIP Business Suite",
            Status = "active",
            AmountPaid = 299000m,
            RenewalDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1)), // Đã quá hạn
            StartedAt = DateTime.UtcNow.AddMonths(-1),
            UpdatedAt = DateTime.UtcNow
        });
        await dbContext.SaveChangesAsync();

        // Act
        await service.ReleaseEscrowAsync(studentId, employerId, jobId, "Thiết kế Banner", jobBudget);
        await dbContext.SaveChangesAsync();

        // Assert - Hoa hồng phải là 10% (100,000đ) thay vì 5% (50,000đ)
        var studentWallet = await dbContext.Wallets.FirstOrDefaultAsync(w => w.UserId == studentId);
        Assert.NotNull(studentWallet);
        Assert.Equal(900000m, studentWallet.Balance); // 1,000,000 - 10% (100,000) = 900,000

        var receipt = await dbContext.Receipts.FirstOrDefaultAsync(r => r.JobId == jobId);
        Assert.NotNull(receipt);
        Assert.Equal(1000000m, receipt.Budget);
        Assert.Equal(100000m, receipt.Commission);
    }

    [Fact]
    public async Task ReleaseEscrowAsync_DuplicateCall_ShouldThrowBusinessException_IdempotencyGuard()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new EscrowPaymentService(dbContext, _loggerMock.Object);

        var employerId = 1;
        var studentId = 2;
        var jobId = 303;
        var jobBudget = 200000m;

        // First release succeeds
        await service.ReleaseEscrowAsync(studentId, employerId, jobId, "Job 303", jobBudget);
        await dbContext.SaveChangesAsync();

        // Act & Assert: Second concurrent/duplicate release must be rejected
        var ex = await Assert.ThrowsAsync<BusinessException>(async () =>
        {
            await service.ReleaseEscrowAsync(studentId, employerId, jobId, "Job 303", jobBudget);
        });

        Assert.Contains("đã được giải ngân", ex.Message);
    }

    [Fact]
    public async Task RefundEscrowAsync_WhenAlreadyReleased_ShouldThrowBusinessException()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new EscrowPaymentService(dbContext, _loggerMock.Object);

        var employerId = 1;
        var studentId = 2;
        var jobId = 404;
        var jobBudget = 300000m;

        // Already released
        await service.ReleaseEscrowAsync(studentId, employerId, jobId, "Job 404", jobBudget);
        await dbContext.SaveChangesAsync();

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(async () =>
        {
            await service.RefundEscrowAsync(employerId, jobId, "Job 404", jobBudget, "Hủy");
        });

        Assert.Contains("đã được giải ngân", ex.Message);
    }

    [Fact]
    public async Task RefundEscrowAsync_DuplicateCall_ShouldThrowBusinessException_IdempotencyGuard()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new EscrowPaymentService(dbContext, _loggerMock.Object);

        var employerId = 1;
        var jobId = 505;
        var jobBudget = 400000m;

        // First refund succeeds
        await service.RefundEscrowAsync(employerId, jobId, "Job 505", jobBudget, "Hủy lần 1");
        await dbContext.SaveChangesAsync();

        // Act & Assert: Duplicate refund must throw
        var ex = await Assert.ThrowsAsync<BusinessException>(async () =>
        {
            await service.RefundEscrowAsync(employerId, jobId, "Job 505", jobBudget, "Hủy lần 2");
        });

        Assert.Contains("đã được hoàn tiền", ex.Message);
    }
}
