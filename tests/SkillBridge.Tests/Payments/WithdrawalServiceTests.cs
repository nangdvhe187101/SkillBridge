using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Payments;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Services.Payments;
using Xunit;

namespace SkillBridge.Tests.Payments;

public class WithdrawalServiceTests
{
    private readonly Mock<ILogger<WithdrawalService>> _loggerMock = new();
    private readonly IConfiguration _config;

    public WithdrawalServiceTests()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            { "Encryption:Key", "12345678901234567890123456789012" } // 32 chars for AES
        };

        _config = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();
    }

    private SkillBridgeDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<SkillBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new SkillBridgeDbContext(options);
    }

    private static User CreateValidUser(int id, string email, string name = "Test User")
    {
        return new User
        {
            Id = id,
            FullName = name,
            Email = email,
            AccountStatus = "active",
            KycStatus = "verified",
            PasswordHash = "hash123"
        };
    }

    [Fact]
    public async Task RequestWithdrawalAsync_ShouldThrow_WhenAmountBelowMinimum()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new WithdrawalService(dbContext, _config, _loggerMock.Object);

        var dto = new CreateWithdrawalDto { Amount = 30000m };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.RequestWithdrawalAsync(1, dto));

        Assert.Contains("50.000", ex.Message);
    }

    [Fact]
    public async Task RequestWithdrawalAsync_ShouldThrow_WhenBankAccountNotVerified()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new WithdrawalService(dbContext, _config, _loggerMock.Object);

        var userId = 10;
        dbContext.Users.Add(CreateValidUser(userId, "u10@test.com"));
        dbContext.Wallets.Add(new Wallet { UserId = userId, Balance = 200000m, IsBankVerified = false });
        await dbContext.SaveChangesAsync();

        var dto = new CreateWithdrawalDto { Amount = 100000m };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.RequestWithdrawalAsync(userId, dto));

        Assert.Contains("chưa được Quản trị viên phê duyệt xác thực", ex.Message);
    }

    [Fact]
    public async Task RequestWithdrawalAsync_ShouldThrow_WhenBalanceInsufficient()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new WithdrawalService(dbContext, _config, _loggerMock.Object);

        var userId = 11;
        dbContext.Users.Add(CreateValidUser(userId, "u11@test.com"));
        dbContext.Wallets.Add(new Wallet
        {
            UserId = userId,
            Balance = 40000m,
            IsBankVerified = true,
            BankName = "MB Bank",
            AccountNumber = "0987654321",
            AccountHolder = "NGUYEN VAN A"
        });
        await dbContext.SaveChangesAsync();

        var dto = new CreateWithdrawalDto { Amount = 100000m };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.RequestWithdrawalAsync(userId, dto));

        Assert.Contains("không đủ", ex.Message);
    }

    [Fact]
    public async Task RequestWithdrawalAsync_ShouldDeductBalance_AndCreatePendingRequest()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new WithdrawalService(dbContext, _config, _loggerMock.Object);

        var userId = 12;
        dbContext.Users.Add(CreateValidUser(userId, "u12@test.com", "Nguyen Van B"));
        dbContext.Wallets.Add(new Wallet
        {
            UserId = userId,
            Balance = 500000m,
            IsBankVerified = true,
            BankName = "Techcombank",
            AccountNumber = "1903333333",
            AccountHolder = "NGUYEN VAN B"
        });
        await dbContext.SaveChangesAsync();

        var dto = new CreateWithdrawalDto { Amount = 200000m };

        // Act
        var result = await service.RequestWithdrawalAsync(userId, dto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(200000m, result.Amount);
        Assert.Equal("pending", result.Status);

        var updatedWallet = await dbContext.Wallets.FirstAsync(w => w.UserId == userId);
        Assert.Equal(300000m, updatedWallet.Balance);

        var requestInDb = await dbContext.WithdrawalRequests.FirstAsync(w => w.UserId == userId);
        Assert.Equal(200000m, requestInDb.Amount);
        Assert.Equal("pending", requestInDb.Status);

        var tx = await dbContext.Transactions.FirstOrDefaultAsync(t => t.Id == requestInDb.TransactionId && t.Type == "withdraw_hold");
        Assert.NotNull(tx);
        Assert.Equal(200000m, tx.Amount);
        Assert.Equal(-1, tx.Sign);
    }

    [Fact]
    public async Task ApproveWithdrawalAsync_ShouldUpdateStatusToCompleted_AndRecordAdmin()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new WithdrawalService(dbContext, _config, _loggerMock.Object);

        var userId = 13;
        var adminUserId = 99;
        dbContext.Users.Add(CreateValidUser(userId, "u13@test.com", "User 13"));
        dbContext.Users.Add(CreateValidUser(adminUserId, "admin@skillbridge.vn", "Super Admin"));

        var bankAccount = new BankAccount
        {
            Id = 1,
            UserId = userId,
            BankName = "Vietcombank",
            AccountNumberEncrypted = "enc",
            AccountNumberMask = "****1234",
            AccountHolderName = "NGUYEN VAN C",
            IsVerified = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        dbContext.BankAccounts.Add(bankAccount);

        var request = new WithdrawalRequest
        {
            Id = 101,
            UserId = userId,
            BankAccountId = 1,
            Amount = 150000m,
            Status = "pending",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        dbContext.WithdrawalRequests.Add(request);
        await dbContext.SaveChangesAsync();

        // Act
        var dto = new AdminApproveWithdrawalDto { Note = "UNC #998877" };
        var result = await service.ApproveWithdrawalAsync(adminUserId, 101, dto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("completed", result.Status);

        var updated = await dbContext.WithdrawalRequests.FirstAsync(w => w.Id == 101);
        Assert.Equal("completed", updated.Status);
        Assert.NotNull(updated.ProcessedBy);
    }

    [Fact]
    public async Task ApproveWithdrawalAsync_ShouldThrow_WhenNotPending()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new WithdrawalService(dbContext, _config, _loggerMock.Object);

        var userId = 14;
        var adminUserId = 98;
        dbContext.Users.Add(CreateValidUser(userId, "u14@test.com", "User 14"));
        dbContext.Users.Add(CreateValidUser(adminUserId, "admin2@skillbridge.vn", "Admin 2"));

        var bankAccount = new BankAccount
        {
            Id = 2,
            UserId = userId,
            BankName = "VPBank",
            AccountNumberEncrypted = "enc",
            AccountNumberMask = "****9999",
            AccountHolderName = "USER 14",
            IsVerified = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        dbContext.BankAccounts.Add(bankAccount);

        var request = new WithdrawalRequest
        {
            Id = 102,
            UserId = userId,
            BankAccountId = 2,
            Amount = 150000m,
            Status = "completed",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        dbContext.WithdrawalRequests.Add(request);
        await dbContext.SaveChangesAsync();

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.ApproveWithdrawalAsync(adminUserId, 102, new AdminApproveWithdrawalDto()));

        Assert.Contains("Chỉ có thể phê duyệt yêu cầu rút tiền đang ở trạng thái Chờ duyệt", ex.Message);
    }

    [Fact]
    public async Task RejectWithdrawalAsync_ShouldRefundWalletBalance_AndSetStatusToRejected()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new WithdrawalService(dbContext, _config, _loggerMock.Object);

        var userId = 15;
        var adminUserId = 88;
        dbContext.Users.Add(CreateValidUser(userId, "u15@test.com", "User 15"));
        dbContext.Users.Add(CreateValidUser(adminUserId, "reviewer@skillbridge.vn", "Admin Reviewer"));
        dbContext.Wallets.Add(new Wallet { UserId = userId, Balance = 50000m });

        var bankAccount = new BankAccount
        {
            Id = 3,
            UserId = userId,
            BankName = "MB Bank",
            AccountNumberEncrypted = "enc",
            AccountNumberMask = "****5678",
            AccountHolderName = "TRAN THI D",
            IsVerified = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        dbContext.BankAccounts.Add(bankAccount);

        var request = new WithdrawalRequest
        {
            Id = 103,
            UserId = userId,
            BankAccountId = 3,
            Amount = 200000m,
            Status = "pending",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        dbContext.WithdrawalRequests.Add(request);
        await dbContext.SaveChangesAsync();

        // Act
        var dto = new AdminRejectWithdrawalDto { Reason = "Thông tin tài khoản không hợp lệ" };
        var result = await service.RejectWithdrawalAsync(adminUserId, 103, dto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("rejected", result.Status);
        Assert.Equal("Thông tin tài khoản không hợp lệ", result.RejectReason);

        var updatedRequest = await dbContext.WithdrawalRequests.FirstAsync(w => w.Id == 103);
        Assert.Equal("rejected", updatedRequest.Status);
        Assert.NotNull(updatedRequest.ProcessedBy);
        Assert.Equal("Thông tin tài khoản không hợp lệ", updatedRequest.RejectReason);

        var updatedWallet = await dbContext.Wallets.FirstAsync(w => w.UserId == userId);
        Assert.Equal(250000m, updatedWallet.Balance); // 50,000 + 200,000 refunded

        var refundTx = await dbContext.Transactions.FirstOrDefaultAsync(t => t.ReferenceId == 103 && t.Type == "withdraw_refund");
        Assert.NotNull(refundTx);
        Assert.Equal(200000m, refundTx.Amount);
        Assert.Equal(1, refundTx.Sign);
    }

    [Fact]
    public async Task RejectWithdrawalAsync_ShouldThrow_WhenReasonEmpty()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new WithdrawalService(dbContext, _config, _loggerMock.Object);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.RejectWithdrawalAsync(1, 104, new AdminRejectWithdrawalDto { Reason = "   " }));

        Assert.Contains("lý do từ chối", ex.Message);
    }
}
