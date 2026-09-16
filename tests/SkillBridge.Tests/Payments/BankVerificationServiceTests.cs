using System;
using System.IO;
using System.Linq;
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

public class BankVerificationServiceTests
{
    private readonly Mock<ILogger<BankVerificationService>> _loggerMock = new();
    private readonly Mock<ILogger<WalletService>> _walletLoggerMock = new();

    private SkillBridgeDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<SkillBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new SkillBridgeDbContext(options);
    }

    [Fact]
    public async Task CreateRequest_WhenUserHasPendingRequest_ShouldThrowBusinessException()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new BankVerificationService(dbContext, _loggerMock.Object);

        var userId = 101;
        dbContext.Users.Add(new User
        {
            Id = userId,
            FullName = "Nguyen Van A",
            Email = "a@gmail.com",
            PasswordHash = "x",
            RoleId = 2,
            AccountStatus = "active",
            KycStatus = "verified"
        });

        dbContext.BankVerificationRequests.Add(new BankVerificationRequest
        {
            UserId = userId,
            BankName = "MB Bank",
            BankCode = "970422",
            AccountNumber = "encrypted_1",
            AccountNumberMask = "****1234",
            Status = BankVerificationStatus.Pending,
            SubmittedAt = DateTime.UtcNow
        });

        await dbContext.SaveChangesAsync();

        var dto = new CreateBankVerificationDto
        {
            BankName = "Techcombank",
            BankCode = "970407",
            AccountNumber = "1903654321012"
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.CreateRequestAsync(userId, dto));

        Assert.Contains("đang chờ duyệt", ex.Message);
    }

    [Fact]
    public async Task CreateRequest_WhenExceedingDailyRateLimit_ShouldThrowBusinessException()
    {
        // Arrange (Tối đa 3 request trong 24 giờ)
        using var dbContext = CreateInMemoryDbContext();
        var service = new BankVerificationService(dbContext, _loggerMock.Object);

        var userId = 102;
        dbContext.Users.Add(new User
        {
            Id = userId,
            FullName = "Le Van B",
            Email = "b@gmail.com",
            PasswordHash = "x",
            RoleId = 2,
            AccountStatus = "active",
            KycStatus = "verified"
        });

        // Tạo 3 request đã bị rejected hoặc cancelled trong 24 giờ qua
        for (int i = 0; i < 3; i++)
        {
            dbContext.BankVerificationRequests.Add(new BankVerificationRequest
            {
                UserId = userId,
                BankName = "MB Bank",
                BankCode = "970422",
                AccountNumber = $"encrypted_{i}",
                AccountNumberMask = $"****{i}234",
                Status = BankVerificationStatus.Rejected,
                SubmittedAt = DateTime.UtcNow.AddHours(-i - 1)
            });
        }

        await dbContext.SaveChangesAsync();

        var dto = new CreateBankVerificationDto
        {
            BankName = "Vietcombank",
            BankCode = "970436",
            AccountNumber = "0987654321"
        };

        // Act & Assert (Request thứ 4 bị chặn)
        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.CreateRequestAsync(userId, dto));

        Assert.Contains("ngày", ex.Message);
    }

    [Fact]
    public async Task CreateRequest_WhenExceedingMonthlyRateLimit_ShouldThrowBusinessException()
    {
        // Arrange (Tối đa 10 request trong 30 ngày)
        using var dbContext = CreateInMemoryDbContext();
        var service = new BankVerificationService(dbContext, _loggerMock.Object);

        var userId = 103;
        dbContext.Users.Add(new User
        {
            Id = userId,
            FullName = "Tran Van C",
            Email = "c@gmail.com",
            PasswordHash = "x",
            RoleId = 2,
            AccountStatus = "active",
            KycStatus = "verified"
        });

        // Tạo 10 request đã xong trong vòng 30 ngày qua (mỗi ngày 1 request)
        for (int i = 0; i < 10; i++)
        {
            dbContext.BankVerificationRequests.Add(new BankVerificationRequest
            {
                UserId = userId,
                BankName = "MB Bank",
                BankCode = "970422",
                AccountNumber = $"encrypted_{i}",
                AccountNumberMask = $"****{i}234",
                Status = BankVerificationStatus.Cancelled,
                SubmittedAt = DateTime.UtcNow.AddDays(-i - 2)
            });
        }

        await dbContext.SaveChangesAsync();

        var dto = new CreateBankVerificationDto
        {
            BankName = "ACB",
            BankCode = "970416",
            AccountNumber = "9988776655"
        };

        // Act & Assert (Request thứ 11 trong tháng bị chặn)
        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.CreateRequestAsync(userId, dto));

        Assert.Contains("tháng", ex.Message);
    }

    [Fact]
    public async Task CreateRequest_WhenWalletWasVerified_ShouldResetIsBankVerifiedToFalse()
    {
        // Arrange: User đã có ví được xác thực trước đó
        using var dbContext = CreateInMemoryDbContext();
        var service = new BankVerificationService(dbContext, _loggerMock.Object);

        var userId = 104;
        dbContext.Users.Add(new User
        {
            Id = userId,
            FullName = "Pham Thi D",
            Email = "d@gmail.com",
            PasswordHash = "x",
            RoleId = 2,
            AccountStatus = "active",
            KycStatus = "verified"
        });

        var wallet = new Wallet
        {
            UserId = userId,
            Balance = 500000m,
            BankName = "VietinBank",
            BankBin = "970415",
            AccountNumber = "1010101010",
            AccountHolder = "PHAM THI D",
            IsBankVerified = true
        };
        dbContext.Wallets.Add(wallet);
        await dbContext.SaveChangesAsync();

        var dto = new CreateBankVerificationDto
        {
            BankName = "Techcombank",
            BankCode = "970407",
            AccountNumber = "8888999900"
        };

        // Act: User nộp yêu cầu mới đổi STK
        var result = await service.CreateRequestAsync(userId, dto);

        // Assert: Ngay khi nộp, cờ IsBankVerified của ví phải bị hạ xuống false
        var updatedWallet = await dbContext.Wallets.FirstAsync(w => w.UserId == userId);
        Assert.False(updatedWallet.IsBankVerified);
        Assert.Equal("pending", result.Status);
    }

    [Fact]
    public async Task CancelRequest_WhenStatusIsPending_ShouldSucceed()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new BankVerificationService(dbContext, _loggerMock.Object);

        var userId = 105;
        var req = new BankVerificationRequest
        {
            Id = 55,
            UserId = userId,
            BankName = "MB Bank",
            BankCode = "970422",
            AccountNumber = "encrypted_x",
            AccountNumberMask = "****1234",
            Status = BankVerificationStatus.Pending,
            SubmittedAt = DateTime.UtcNow
        };
        dbContext.BankVerificationRequests.Add(req);
        await dbContext.SaveChangesAsync();

        // Act
        var result = await service.CancelRequestAsync(userId, 55);

        // Assert
        Assert.Equal("cancelled", result.Status);
        var dbReq = await dbContext.BankVerificationRequests.FirstAsync(r => r.Id == 55);
        Assert.Equal(BankVerificationStatus.Cancelled, dbReq.Status);
    }

    [Fact]
    public async Task CancelRequest_WhenStatusIsNotPending_ShouldThrowBusinessException()
    {
        // Arrange: Record đã approved hoặc rejected
        using var dbContext = CreateInMemoryDbContext();
        var service = new BankVerificationService(dbContext, _loggerMock.Object);

        var userId = 106;
        var req = new BankVerificationRequest
        {
            Id = 56,
            UserId = userId,
            BankName = "MB Bank",
            BankCode = "970422",
            AccountNumber = "encrypted_x",
            AccountNumberMask = "****1234",
            Status = BankVerificationStatus.Approved,
            SubmittedAt = DateTime.UtcNow
        };
        dbContext.BankVerificationRequests.Add(req);
        await dbContext.SaveChangesAsync();

        // Act & Assert
        await Assert.ThrowsAsync<BusinessException>(() =>
            service.CancelRequestAsync(userId, 56));
    }

    [Fact]
    public async Task ApproveRequest_WithoutBankReturnedName_ShouldThrowBusinessException()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new BankVerificationService(dbContext, _loggerMock.Object);

        var adminId = 1;
        dbContext.Users.Add(new User { Id = adminId, FullName = "Super Admin", Email = "admin@skillbridge.vn", PasswordHash = "x", RoleId = 1, AccountStatus = "active", KycStatus = "verified" });

        var req = new BankVerificationRequest
        {
            Id = 60,
            UserId = 107,
            BankName = "MB Bank",
            BankCode = "970422",
            AccountNumber = EncryptionHelper.Encrypt("0987654321"),
            AccountNumberMask = "****4321",
            Status = BankVerificationStatus.Pending,
            SubmittedAt = DateTime.UtcNow
        };
        dbContext.BankVerificationRequests.Add(req);
        await dbContext.SaveChangesAsync();

        // Act & Assert (Không truyền BankReturnedName)
        var dto = new AdminApproveBankVerificationDto { BankReturnedName = "" };
        await Assert.ThrowsAsync<BusinessException>(() =>
            service.ApproveRequestAsync(adminId, 60, dto));
    }

    [Fact]
    public async Task ApproveRequest_WhenValid_ShouldApproveAndCancelOtherPendingRequestsAndVerifyWallet()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new BankVerificationService(dbContext, _loggerMock.Object);

        var adminUserId = 1;
        var studentUserId = 200;

        dbContext.Users.AddRange(
            new User { Id = adminUserId, FullName = "Admin Quản Trị", Email = "admin@skillbridge.vn", PasswordHash = "x", RoleId = 1, AccountStatus = "active", KycStatus = "verified" },
            new User { Id = studentUserId, FullName = "Đào Văn Năng", Email = "nangdv@fpt.edu.vn", PasswordHash = "x", RoleId = 2, AccountStatus = "active", KycStatus = "verified" }
        );

        // Request 1 (Sẽ được duyệt)
        var targetReq = new BankVerificationRequest
        {
            Id = 100,
            UserId = studentUserId,
            BankName = "MB Bank",
            BankCode = "970422",
            AccountNumber = EncryptionHelper.Encrypt("036614042004"),
            AccountNumberMask = "****2004",
            Status = BankVerificationStatus.Pending,
            SubmittedAt = DateTime.UtcNow.AddMinutes(-30)
        };

        // Request 2 (Pending khác của cùng user, ví dụ do race condition)
        var anotherPendingReq = new BankVerificationRequest
        {
            Id = 101,
            UserId = studentUserId,
            BankName = "Vietcombank",
            BankCode = "970436",
            AccountNumber = EncryptionHelper.Encrypt("1234567890"),
            AccountNumberMask = "****7890",
            Status = BankVerificationStatus.Pending,
            SubmittedAt = DateTime.UtcNow.AddMinutes(-10)
        };

        dbContext.BankVerificationRequests.AddRange(targetReq, anotherPendingReq);
        dbContext.Wallets.Add(new Wallet { UserId = studentUserId, Balance = 1000000m, IsBankVerified = false });
        await dbContext.SaveChangesAsync();

        var approveDto = new AdminApproveBankVerificationDto
        {
            BankReturnedName = "DAO VAN NANG"
        };

        // Act
        var result = await service.ApproveRequestAsync(adminUserId, 100, approveDto);

        // Assert:
        // 1. Target request chuyển thành Approved
        Assert.Equal("approved", result.Status);
        Assert.Equal("DAO VAN NANG", result.BankReturnedName);
        Assert.NotNull(result.ReviewedAt);

        // 2. Request Pending khác của cùng user tự động chuyển thành Cancelled
        var otherReqDb = await dbContext.BankVerificationRequests.FirstAsync(r => r.Id == 101);
        Assert.Equal(BankVerificationStatus.Cancelled, otherReqDb.Status);

        // 3. Wallet của user được cập nhật IsBankVerified = true và STK giải mã chính xác
        var wallet = await dbContext.Wallets.FirstAsync(w => w.UserId == studentUserId);
        Assert.True(wallet.IsBankVerified);
        Assert.Equal("MB Bank", wallet.BankName);
        Assert.Equal("036614042004", wallet.AccountNumber);
        Assert.Equal("DAO VAN NANG", wallet.AccountHolder);
    }

    [Fact]
    public async Task RejectRequest_WithoutRejectionReason_ShouldThrowBusinessException()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new BankVerificationService(dbContext, _loggerMock.Object);

        var adminId = 1;
        dbContext.Users.Add(new User { Id = adminId, FullName = "Admin", Email = "admin@sb.vn", PasswordHash = "x", RoleId = 1, AccountStatus = "active", KycStatus = "verified" });

        var req = new BankVerificationRequest
        {
            Id = 200,
            UserId = 108,
            BankName = "ACB",
            BankCode = "970416",
            AccountNumber = "encrypted_acb",
            AccountNumberMask = "****9999",
            Status = BankVerificationStatus.Pending,
            SubmittedAt = DateTime.UtcNow
        };
        dbContext.BankVerificationRequests.Add(req);
        await dbContext.SaveChangesAsync();

        // Act & Assert (Không có RejectionReason)
        var dto = new AdminRejectBankVerificationDto { RejectionReason = "" };
        await Assert.ThrowsAsync<BusinessException>(() =>
            service.RejectRequestAsync(adminId, 200, dto));
    }

    [Fact]
    public async Task UpdateBankAccount_WhenWalletIsAlreadyVerified_ShouldPreventDirectModification()
    {
        // Arrange: Ví đã có IsBankVerified = true
        using var dbContext = CreateInMemoryDbContext();
        var walletService = new WalletService(dbContext, _walletLoggerMock.Object);

        var userId = 300;
        dbContext.Users.Add(new User
        {
            Id = userId,
            FullName = "Hoang Van E",
            Email = "e@gmail.com",
            PasswordHash = "x",
            RoleId = 2,
            AccountStatus = "active",
            KycStatus = "verified"
        });

        dbContext.Wallets.Add(new Wallet
        {
            UserId = userId,
            Balance = 200000m,
            BankName = "MB Bank",
            BankBin = "970422",
            AccountNumber = "111122223333",
            AccountHolder = "HOANG VAN E",
            IsBankVerified = true
        });

        await dbContext.SaveChangesAsync();

        var updateRequest = new UpdateBankAccountRequest
        {
            BankBin = "970407",
            BankName = "Techcombank",
            AccountNumber = "999988887777", // Đổi STK khác
            AccountHolder = "HOANG VAN E"
        };

        // Act & Assert: Phải chặn không cho sửa trực tiếp STK
        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            walletService.UpdateBankAccountAsync(userId, updateRequest));

        Assert.Contains("Không thể sửa trực tiếp số tài khoản đã được xác thực", ex.Message);
    }

    [Fact]
    public void VietQrHelper_GenerateAndParse_ShouldExtractCorrectBinAndAccount()
    {
        // Arrange
        var bankBin = "970422";
        var account = "036614042004";

        // Act: Sinh chuỗi VietQR EMVCo
        var payload = VietQrHelper.GeneratePayload(bankBin, account);

        // Assert payload bắt đầu bằng 000201 và có CRC
        Assert.StartsWith("000201", payload);

        // Act: Parse ngược lại từ chuỗi EMVCo
        var success = VietQrHelper.TryParsePayload(payload, out var parsedBin, out var parsedAccount);

        // Assert
        Assert.True(success);
        Assert.Equal(bankBin, parsedBin);
        Assert.Equal(account, parsedAccount);
    }

    [Fact]
    public async Task DecodeQrImageAsync_WithValidVietQrImage_ShouldExtractBinAndAccount()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new BankVerificationService(dbContext, _loggerMock.Object);

        var bankBin = "970422";
        var account = "036614042004";
        var payload = VietQrHelper.GeneratePayload(bankBin, account);

        using var qrGenerator = new QRCoder.QRCodeGenerator();
        using var qrData = qrGenerator.CreateQrCode(payload, QRCoder.QRCodeGenerator.ECCLevel.Q);
        using var pngByteQr = new QRCoder.PngByteQRCode(qrData);
        var qrBytes = pngByteQr.GetGraphic(20);

        using var ms = new MemoryStream(qrBytes);

        // Act
        var result = await service.DecodeQrImageAsync(ms, "bank_qr_test.png");

        // Assert
        Assert.NotNull(result);
        Assert.Equal(bankBin, result.BankCode);
        Assert.Equal(account, result.AccountNumber);
        Assert.Equal(payload, result.RawPayload);
    }
}
