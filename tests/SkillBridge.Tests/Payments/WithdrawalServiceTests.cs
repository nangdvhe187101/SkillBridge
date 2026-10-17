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
using SkillBridge.Infrastructure.Services.Security;
using Xunit;

namespace SkillBridge.Tests.Payments;

public class WithdrawalServiceTests
{
    private readonly Mock<ILogger<WithdrawalService>> _loggerMock = new();
    private readonly IEncryptionKeyProvider _keyProvider;
    private const string EncryptionKey = "12345678901234567890123456789012";

    public WithdrawalServiceTests()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            { "Encryption:Key", EncryptionKey }
        };

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        _keyProvider = new ConfigurationEncryptionKeyProvider(config);
    }

    private SkillBridgeDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<SkillBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new SkillBridgeDbContext(options);
    }

    private WithdrawalService CreateService(SkillBridgeDbContext dbContext, IEncryptionKeyProvider? keyProvider = null)
    {
        return new WithdrawalService(dbContext, keyProvider ?? _keyProvider, _loggerMock.Object, new Mock<SkillBridge.Application.Interfaces.Admin.ISystemSettingService>().Object);
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
        var service = CreateService(dbContext);

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
        var service = CreateService(dbContext);

        var userId = 10;
        dbContext.Users.Add(CreateValidUser(userId, "u10@test.com"));
        dbContext.Wallets.Add(new Wallet
        {
            UserId = userId,
            Balance = 200000m,
            IsBankVerified = false,
            BankName = "Techcombank",
            AccountNumber = "1903333333",
            AccountHolder = "NGUYEN VAN A"
        });
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
        var service = CreateService(dbContext);

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
        var service = CreateService(dbContext);

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
        var service = CreateService(dbContext);

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
        var service = CreateService(dbContext);

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
        var service = CreateService(dbContext);

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
        var service = CreateService(dbContext);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.RejectWithdrawalAsync(1, 104, new AdminRejectWithdrawalDto { Reason = "   " }));

        Assert.Contains("lý do từ chối", ex.Message);
    }

    [Fact]
    public async Task GetAdminListAsync_ShouldMarkDecryptError_WhenDecryptedAccountIsCorrupted()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = CreateService(dbContext);

        var userId = 20;
        dbContext.Users.Add(CreateValidUser(userId, "u20@test.com", "Corrupted User"));

        // Encrypted with another key -> Decryption with current key produces garbage
        var wrongKey = "99999999999999999999999999999999";
        var encryptedWithWrongKey = EncryptionHelper.Encrypt("0123456789", wrongKey);

        var bankAccount = new BankAccount
        {
            Id = 20,
            UserId = userId,
            BankName = "Vietcombank",
            AccountNumberEncrypted = encryptedWithWrongKey,
            AccountNumberMask = "****6789",
            AccountHolderName = "CORRUPTED USER",
            IsVerified = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        dbContext.BankAccounts.Add(bankAccount);

        var request = new WithdrawalRequest
        {
            Id = 201,
            UserId = userId,
            BankAccountId = 20,
            Amount = 100000m,
            Status = "pending",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        dbContext.WithdrawalRequests.Add(request);
        await dbContext.SaveChangesAsync();

        // Act
        var result = await service.GetAdminListAsync("pending", 1, 10);

        // Assert
        Assert.NotNull(result);
        var item = Assert.Single(result.Items);
        Assert.True(item.DecryptError, "DecryptError should be true when STK is corrupted");
        Assert.Null(item.AccountNumberFull);
        Assert.Equal(bankAccount.AccountNumberMask, item.AccountNumberMask);
    }

    [Fact]
    public async Task ApproveWithdrawalAsync_ShouldThrow_E_SEC_01_WhenAdminApprovesOwnWithdrawal()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = CreateService(dbContext);

        var adminUserId = 50;
        dbContext.Users.Add(CreateValidUser(adminUserId, "admin50@skillbridge.vn", "Admin Fifty"));

        var bankAccount = new BankAccount
        {
            Id = 50,
            UserId = adminUserId,
            BankName = "Vietcombank",
            AccountNumberEncrypted = "enc",
            AccountNumberMask = "****5050",
            AccountHolderName = "ADMIN FIFTY",
            IsVerified = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        dbContext.BankAccounts.Add(bankAccount);

        var request = new WithdrawalRequest
        {
            Id = 501,
            UserId = adminUserId, // Cùng User ID với Admin đang thao tác
            BankAccountId = 50,
            Amount = 1000000m,
            Status = "pending",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        dbContext.WithdrawalRequests.Add(request);
        await dbContext.SaveChangesAsync();

        // Act & Assert (DT01-1)
        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.ApproveWithdrawalAsync(adminUserId, 501, new AdminApproveWithdrawalDto()));

        Assert.Contains("E-SEC-01", ex.Message);
        Assert.Contains("Cấm tự phê duyệt", ex.Message);
    }

    [Fact]
    public async Task ApproveWithdrawalAsync_LargeAmount_ShouldTransitionToProcessing_MakerStep1()
    {
        // Arrange (Số tiền > 5.000.000 VNĐ)
        using var dbContext = CreateInMemoryDbContext();
        var service = CreateService(dbContext);

        var userId = 60;
        var makerAdminId = 61;
        dbContext.Users.Add(CreateValidUser(userId, "u60@test.com", "User Sixty"));
        dbContext.Users.Add(CreateValidUser(makerAdminId, "maker@skillbridge.vn", "Maker Admin"));

        var bankAccount = new BankAccount
        {
            Id = 60,
            UserId = userId,
            BankName = "MB Bank",
            AccountNumberEncrypted = "enc",
            AccountNumberMask = "****6060",
            AccountHolderName = "USER SIXTY",
            IsVerified = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        dbContext.BankAccounts.Add(bankAccount);

        var request = new WithdrawalRequest
        {
            Id = 601,
            UserId = userId,
            BankAccountId = 60,
            Amount = 10000000m, // 10 triệu > 5 triệu
            Status = "pending",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        dbContext.WithdrawalRequests.Add(request);
        await dbContext.SaveChangesAsync();

        // Act - Maker duyệt Bước 1 (DT01-3)
        var result = await service.ApproveWithdrawalAsync(makerAdminId, 601, new AdminApproveWithdrawalDto { Note = "Maker check ok" });

        // Assert
        Assert.NotNull(result);
        Assert.Equal("processing", result.Status);
        Assert.True(result.RequiresMakerChecker);
        Assert.True(result.AwaitingChecker);
        Assert.Contains("duyệt bước 1", result.Message ?? "");

        var inDb = await dbContext.WithdrawalRequests.FirstAsync(r => r.Id == 601);
        Assert.Equal("processing", inDb.Status);

        var setting = await dbContext.SystemSettings.FirstOrDefaultAsync(s => s.Key == "withdrawal_maker_601");
        Assert.NotNull(setting);
        Assert.Contains("Maker Admin", setting.Value);
    }

    [Fact]
    public async Task ApproveWithdrawalAsync_LargeAmount_ShouldThrow_E_SEC_02_WhenCheckerIsSameAsMaker()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = CreateService(dbContext);

        var userId = 70;
        var sameAdminId = 71;
        dbContext.Users.Add(CreateValidUser(userId, "u70@test.com", "User Seventy"));
        dbContext.Users.Add(CreateValidUser(sameAdminId, "sameadmin@skillbridge.vn", "Same Admin"));

        var bankAccount = new BankAccount
        {
            Id = 70,
            UserId = userId,
            BankName = "Techcombank",
            AccountNumberEncrypted = "enc",
            AccountNumberMask = "****7070",
            AccountHolderName = "USER SEVENTY",
            IsVerified = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        dbContext.BankAccounts.Add(bankAccount);

        var request = new WithdrawalRequest
        {
            Id = 701,
            UserId = userId,
            BankAccountId = 70,
            Amount = 8000000m,
            Status = "pending",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        dbContext.WithdrawalRequests.Add(request);
        await dbContext.SaveChangesAsync();

        // Maker duyệt bước 1
        await service.ApproveWithdrawalAsync(sameAdminId, 701, new AdminApproveWithdrawalDto { Note = "Step 1" });

        // Act & Assert - Cùng admin duyệt bước 2 (DT01-4)
        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.ApproveWithdrawalAsync(sameAdminId, 701, new AdminApproveWithdrawalDto { Note = "Step 2" }));

        Assert.Contains("E-SEC-02", ex.Message);
        Assert.Contains("Checker phải là Quản trị viên độc lập", ex.Message);
    }

    [Fact]
    public async Task ApproveWithdrawalAsync_LargeAmount_ShouldComplete_WhenCheckerIsDifferentAdmin()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = CreateService(dbContext);

        var userId = 80;
        var makerAdminId = 81;
        var checkerAdminId = 82;
        dbContext.Users.Add(CreateValidUser(userId, "u80@test.com", "User Eighty"));
        dbContext.Users.Add(CreateValidUser(makerAdminId, "maker81@skillbridge.vn", "Maker EightyOne"));
        dbContext.Users.Add(CreateValidUser(checkerAdminId, "checker82@skillbridge.vn", "Checker EightyTwo"));

        var bankAccount = new BankAccount
        {
            Id = 80,
            UserId = userId,
            BankName = "VietinBank",
            AccountNumberEncrypted = "enc",
            AccountNumberMask = "****8080",
            AccountHolderName = "USER EIGHTY",
            IsVerified = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        dbContext.BankAccounts.Add(bankAccount);

        var request = new WithdrawalRequest
        {
            Id = 801,
            UserId = userId,
            BankAccountId = 80,
            Amount = 15000000m,
            Status = "pending",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        dbContext.WithdrawalRequests.Add(request);
        await dbContext.SaveChangesAsync();

        // Maker duyệt bước 1
        await service.ApproveWithdrawalAsync(makerAdminId, 801, new AdminApproveWithdrawalDto { Note = "UNC Step 1" });

        // Act - Checker duyệt bước 2 (DT01-5)
        var result = await service.ApproveWithdrawalAsync(checkerAdminId, 801, new AdminApproveWithdrawalDto { Note = "UNC Step 2 OK" });

        // Assert
        Assert.NotNull(result);
        Assert.Equal("completed", result.Status);
        Assert.False(result.AwaitingChecker);
        Assert.Contains("cấp 2 thành công", result.Message ?? "");

        var inDb = await dbContext.WithdrawalRequests.FirstAsync(r => r.Id == 801);
        Assert.Equal("completed", inDb.Status);
        Assert.NotNull(inDb.ProcessedAt);

        // Setting tạm thời được dọn dẹp
        var setting = await dbContext.SystemSettings.FirstOrDefaultAsync(s => s.Key == "withdrawal_maker_801");
        Assert.Null(setting);
    }

    [Fact]
    public async Task RejectWithdrawalAsync_ShouldRefundAndCleanMakerSetting_WhenRequestInProcessing()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = CreateService(dbContext);

        var userId = 90;
        var makerAdminId = 91;
        var rejectAdminId = 92;
        dbContext.Users.Add(CreateValidUser(userId, "u90@test.com", "User Ninety"));
        dbContext.Users.Add(CreateValidUser(makerAdminId, "maker91@skillbridge.vn", "Maker NinetyOne"));
        dbContext.Users.Add(CreateValidUser(rejectAdminId, "rejector92@skillbridge.vn", "Rejector NinetyTwo"));
        dbContext.Wallets.Add(new Wallet { UserId = userId, Balance = 100000m });

        var bankAccount = new BankAccount
        {
            Id = 90,
            UserId = userId,
            BankName = "ACB",
            AccountNumberEncrypted = "enc",
            AccountNumberMask = "****9090",
            AccountHolderName = "USER NINETY",
            IsVerified = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        dbContext.BankAccounts.Add(bankAccount);

        var request = new WithdrawalRequest
        {
            Id = 901,
            UserId = userId,
            BankAccountId = 90,
            Amount = 6000000m,
            Status = "pending",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        dbContext.WithdrawalRequests.Add(request);
        await dbContext.SaveChangesAsync();

        // Bước 1: Maker duyệt
        await service.ApproveWithdrawalAsync(makerAdminId, 901, new AdminApproveWithdrawalDto { Note = "Step 1" });

        // Act: Checker phát hiện sai lệch và từ chối ở bước 2
        var rejectDto = new AdminRejectWithdrawalDto { Reason = "Phát hiện dấu hiệu gian lận tài khoản nhận tiền" };
        var result = await service.RejectWithdrawalAsync(rejectAdminId, 901, rejectDto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("rejected", result.Status);
        Assert.Equal(rejectDto.Reason, result.RejectReason);

        // Hoàn 100% tiền về ví
        var wallet = await dbContext.Wallets.FirstAsync(w => w.UserId == userId);
        Assert.Equal(6100000m, wallet.Balance); // 100.000 + 6.000.000

        var refundTx = await dbContext.Transactions.FirstOrDefaultAsync(t => t.ReferenceId == 901 && t.Type == "withdraw_refund");
        Assert.NotNull(refundTx);
        Assert.Equal(6000000m, refundTx.Amount);

        // Setting Maker được dọn dẹp
        var setting = await dbContext.SystemSettings.FirstOrDefaultAsync(s => s.Key == "withdrawal_maker_901");
        Assert.Null(setting);
    }

    [Fact]
    public async Task RequestWithdrawalAsync_Student_ThrowsWhenAccountHolderDoesNotMatchStudentCard()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = CreateService(dbContext);

        var userId = 50;
        var studentRole = new Role { Id = 3, Code = "student", Name = "Sinh viên", Type = "student", IsActive = true };
        dbContext.Roles.Add(studentRole);

        var user = CreateValidUser(userId, "student50@test.com", "Đặng Văn Năng");
        user.RoleId = studentRole.Id;
        user.Role = studentRole;
        dbContext.Users.Add(user);

        dbContext.StudentProfiles.Add(new StudentProfile
        {
            UserId = userId,
            SchoolId = 1,
            StudentCode = "SE187101",
            StudentCodeNormalized = "SE187101",
            VerifiedFullName = "Đặng Văn Năng",
            GraduationYear = 2026,
            VerifiedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddYears(1),
            SourceRequestId = 1
        });

        dbContext.Wallets.Add(new Wallet
        {
            UserId = userId,
            Balance = 1000000m,
            IsBankVerified = true,
            BankName = "MBBank",
            AccountNumber = "0987654321",
            AccountHolder = "NGUYEN VAN KHAC" // KHÔNG KHỚP
        });
        await dbContext.SaveChangesAsync();

        var dto = new CreateWithdrawalDto { Amount = 100000m };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.RequestWithdrawalAsync(userId, dto));

        Assert.Contains("không khớp với tên trên thẻ sinh viên", ex.Message);
    }

    [Fact]
    public async Task RequestWithdrawalAsync_Student_SucceedsWhenAccountHolderMatchesStudentCard()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = CreateService(dbContext);

        var userId = 51;
        var studentRole = new Role { Id = 3, Code = "student", Name = "Sinh viên", Type = "student", IsActive = true };
        dbContext.Roles.Add(studentRole);

        var user = CreateValidUser(userId, "student51@test.com", "Đặng Văn Năng");
        user.RoleId = studentRole.Id;
        user.Role = studentRole;
        dbContext.Users.Add(user);

        dbContext.StudentProfiles.Add(new StudentProfile
        {
            UserId = userId,
            SchoolId = 1,
            StudentCode = "SE187101",
            StudentCodeNormalized = "SE187101",
            VerifiedFullName = "Đặng Văn Năng",
            GraduationYear = 2026,
            VerifiedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddYears(1),
            SourceRequestId = 1
        });

        dbContext.Wallets.Add(new Wallet
        {
            UserId = userId,
            Balance = 1000000m,
            IsBankVerified = true,
            BankName = "MBBank",
            AccountNumber = "0987654321",
            AccountHolder = "DANG VAN NANG" // KHỚP (sau chuẩn hóa không dấu)
        });
        await dbContext.SaveChangesAsync();

        var dto = new CreateWithdrawalDto { Amount = 100000m };

        // Act
        var result = await service.RequestWithdrawalAsync(userId, dto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(100000m, result.Amount);
    }
}
