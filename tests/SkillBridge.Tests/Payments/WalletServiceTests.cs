using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Services.Payments;
using Xunit;

namespace SkillBridge.Tests.Payments;

public class WalletServiceTests
{
    private readonly Mock<ILogger<WalletService>> _loggerMock = new();

    private SkillBridgeDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<SkillBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new SkillBridgeDbContext(options);
    }

    [Fact]
    public async Task GetMyWalletAsync_ShouldCalculateEscrowLocked_FromActiveJobs()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new WalletService(dbContext, _loggerMock.Object);

        var employerId = 5;

        // Add wallet
        dbContext.Wallets.Add(new Wallet { UserId = employerId, Balance = 1200000m });

        // Add jobs for employer
        // Job 1: in_progress -> Escrow held 300,000
        dbContext.Jobs.Add(new Job
        {
            Id = 1,
            EmployerId = employerId,
            Title = "Job 1",
            Description = "Desc 1",
            Budget = 300000m,
            EscrowAmount = 300000m,
            Status = "in_progress",
            PostedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });

        // Job 2: submitted -> Escrow held 250,000
        dbContext.Jobs.Add(new Job
        {
            Id = 2,
            EmployerId = employerId,
            Title = "Job 2",
            Description = "Desc 2",
            Budget = 250000m,
            EscrowAmount = 250000m,
            Status = "submitted",
            PostedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });

        // Job 3: completed -> Escrow released (null)
        dbContext.Jobs.Add(new Job
        {
            Id = 3,
            EmployerId = employerId,
            Title = "Job 3",
            Description = "Desc 3",
            Budget = 500000m,
            EscrowAmount = null,
            Status = "completed",
            PostedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });

        // Job 4: open -> No escrow yet
        dbContext.Jobs.Add(new Job
        {
            Id = 4,
            EmployerId = employerId,
            Title = "Job 4",
            Description = "Desc 4",
            Budget = 400000m,
            EscrowAmount = null,
            Status = "open",
            PostedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });

        await dbContext.SaveChangesAsync();

        // Act
        var result = await service.GetMyWalletAsync(employerId);

        // Assert
        Assert.Equal(1200000m, result.Balance);
        Assert.Equal(550000m, result.EscrowLocked); // 300,000 + 250,000 = 550,000
    }

    [Fact]
    public async Task GetMyWalletAsync_ShouldReturnReceipts_WithCorrectNetPayout()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new WalletService(dbContext, _loggerMock.Object);

        var userId = 7;
        dbContext.Wallets.Add(new Wallet { UserId = userId, Balance = 450000m });

        var student = new User { Id = userId, FullName = "Sinh Vien Test", Email = "sv@fpt.edu.vn", PasswordHash = "x", RoleId = 2, AccountStatus = "active", KycStatus = "verified" };
        var employer = new User { Id = 99, FullName = "Nha Tuyen Dung Test", Email = "ntd@test.com", PasswordHash = "x", RoleId = 1, AccountStatus = "active", KycStatus = "verified" };
        var job = new Job { Id = 10, Title = "Job 10", Description = "Desc", Budget = 500000m, EmployerId = 99, Status = "completed", PostedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };

        dbContext.Users.AddRange(student, employer);
        dbContext.Jobs.Add(job);

        // Add a receipt where userId is the student
        dbContext.Receipts.Add(new Receipt
        {
            Id = 1,
            JobId = 10,
            StudentId = userId,
            EmployerId = 99,
            Budget = 500000m,
            Commission = 50000m,
            Total = 500000m,
            CreatedAt = DateTime.UtcNow
        });

        await dbContext.SaveChangesAsync();

        // Act
        var result = await service.GetMyWalletAsync(userId);

        // Assert
        Assert.Single(result.Receipts);
        var r = result.Receipts[0];
        Assert.Equal(500000m, r.Budget);
        Assert.Equal(50000m, r.Commission);
        Assert.Equal(500000m, r.Total);
        Assert.Equal(450000m, r.NetPayout); // 500,000 - 50,000 = 450,000
    }
}
