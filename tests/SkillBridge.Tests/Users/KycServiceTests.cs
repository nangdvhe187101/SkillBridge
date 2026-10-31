using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Storage;
using SkillBridge.Application.DTOs.Users;
using SkillBridge.Application.Interfaces.Storage;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Services.Users;
using Xunit;

namespace SkillBridge.Tests.Users;

public class KycServiceTests
{
    private readonly Mock<IStorageService> _storageMock = new();
    private readonly Mock<ILogger<KycService>> _loggerMock = new();

    private SkillBridgeDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<SkillBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new SkillBridgeDbContext(options);
    }

    [Fact]
    public async Task GetKycStatusAsync_WhenNoDocuments_ShouldReturnUnverified()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var user = new User
        {
            Id = 1,
            FullName = "Nguyễn Văn Sinh Viên",
            Email = "student@skillbridge.vn",
            PasswordHash = "hashed",
            RoleId = 2,
            AccountStatus = "active",
            KycStatus = "pending",
            ReliabilityScore = 80
        };
        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();

        var service = new KycService(dbContext, _storageMock.Object, _loggerMock.Object);

        // Act
        var result = await service.GetKycStatusAsync(1);

        // Assert
        Assert.Equal("unverified", result.KycStatus);
        Assert.Empty(result.Documents);
    }

    [Fact]
    public async Task SubmitKycAsync_ValidStudentCard_ShouldCreateDocumentsAndSetPending()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var user = new User
        {
            Id = 2,
            FullName = "Trần Thị Sinh Viên",
            Email = "student2@skillbridge.vn",
            PasswordHash = "hashed",
            RoleId = 2,
            AccountStatus = "active",
            KycStatus = "pending",
            ReliabilityScore = 85
        };
        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();

        _storageMock.Setup(s => s.UploadStreamAsync(
            It.IsAny<Stream>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FileUploadResult
            {
                FileKey = "kyc/documents/2/test.jpg",
                FileUrl = "https://r2.skillbridge.vn/kyc/documents/2/test.jpg",
                FileName = "test.jpg",
                ContentType = "image/jpeg",
                FileSize = 1024
            });

        _storageMock.Setup(s => s.GetPublicUrl(It.IsAny<string>()))
            .Returns<string>(url => url);

        var service = new KycService(dbContext, _storageMock.Object, _loggerMock.Object);

        var request = new SubmitKycRequest
        {
            DocumentType = "student_card",
            School = "Đại học Bách Khoa Hà Nội",
            StudentIdNumber = "20220001",
            GraduationYear = DateTime.UtcNow.Year + 2
        };

        var files = new List<KycFileUploadModel>
        {
            new KycFileUploadModel
            {
                FileStream = new MemoryStream(Encoding.UTF8.GetBytes("fake student card image content")),
                FileName = "the_sinh_vien.jpg",
                ContentType = "image/jpeg",
                Length = 1024,
                DocType = "student_card"
            }
        };

        // Act
        var result = await service.SubmitKycAsync(2, request, files);

        // Assert
        Assert.Equal("pending", result.KycStatus);
        Assert.Equal("Đại học Bách Khoa Hà Nội", result.School);
        Assert.Equal("20220001", result.StudentIdNumber);
        Assert.Equal(DateTime.UtcNow.Year + 2, result.GraduationYear);
        Assert.Single(result.Documents);

        var updatedUser = await dbContext.Users.FindAsync(2);
        Assert.NotNull(updatedUser);
        Assert.Equal("pending", updatedUser.KycStatus);
        Assert.Contains("20220001", updatedUser.School);
    }

    [Fact]
    public async Task SubmitKycAsync_GraduationYearInPast_ShouldThrowBusinessException()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var user = new User
        {
            Id = 3,
            FullName = "Lê Văn A",
            Email = "student3@skillbridge.vn",
            PasswordHash = "hashed",
            RoleId = 2,
            AccountStatus = "active",
            KycStatus = "pending",
            ReliabilityScore = 80
        };
        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();

        var service = new KycService(dbContext, _storageMock.Object, _loggerMock.Object);

        var request = new SubmitKycRequest
        {
            DocumentType = "student_card",
            School = "Đại học Quốc Gia",
            StudentIdNumber = "QG12345",
            GraduationYear = DateTime.UtcNow.Year - 1 // Quá khứ
        };

        var files = new List<KycFileUploadModel>
        {
            new KycFileUploadModel
            {
                FileStream = new MemoryStream(Encoding.UTF8.GetBytes("fake content")),
                FileName = "the.png",
                ContentType = "image/png",
                Length = 500,
                DocType = "student_card"
            }
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.SubmitKycAsync(3, request, files));

        Assert.Contains("Năm tốt nghiệp dự kiến không hợp lệ", ex.Message);
    }

    [Fact]
    public async Task SubmitKycAsync_WhenAlreadyPending_ShouldThrowBusinessException()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var user = new User
        {
            Id = 4,
            FullName = "Phạm Thị B",
            Email = "student4@skillbridge.vn",
            PasswordHash = "hashed",
            RoleId = 2,
            AccountStatus = "active",
            KycStatus = "pending",
            ReliabilityScore = 80
        };
        dbContext.Users.Add(user);

        // Đã có 1 tài liệu nộp trước đó -> trạng thái đang là pending
        var doc = new IdentityDocument
        {
            UserId = 4,
            DocType = "student_card",
            FileName = "card.jpg",
            FileUrl = "https://r2/card.jpg",
            PublicId = "kyc/4/card.jpg",
            FileType = "image/jpeg",
            FileSize = 1000,
            UploadedAt = DateTime.UtcNow
        };
        dbContext.IdentityDocuments.Add(doc);
        await dbContext.SaveChangesAsync();

        var service = new KycService(dbContext, _storageMock.Object, _loggerMock.Object);

        var request = new SubmitKycRequest
        {
            DocumentType = "student_card",
            School = "Đại học Ngoại Thương",
            StudentIdNumber = "FTU123",
            GraduationYear = DateTime.UtcNow.Year + 1
        };

        var files = new List<KycFileUploadModel>
        {
            new KycFileUploadModel
            {
                FileStream = new MemoryStream(Encoding.UTF8.GetBytes("fake")),
                FileName = "card2.jpg",
                ContentType = "image/jpeg",
                Length = 500,
                DocType = "student_card"
            }
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.SubmitKycAsync(4, request, files));

        Assert.Contains("đang được chuyên viên thẩm định", ex.Message);
    }

    [Fact]
    public async Task GetKycStatusAsync_WhenGraduationYearPassed_ShouldReturnExpired()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var pastYear = DateTime.UtcNow.Year - 1;
        var user = new User
        {
            Id = 5,
            FullName = "Cựu Sinh Viên C",
            Email = "alumni@skillbridge.vn",
            PasswordHash = "hashed",
            RoleId = 2,
            AccountStatus = "active",
            KycStatus = "verified", // Đã từng verified
            School = $"Đại học FPT | MSSV: HE123456 | Grad: {pastYear}",
            ReliabilityScore = 95
        };
        dbContext.Users.Add(user);

        var doc = new IdentityDocument
        {
            UserId = 5,
            DocType = "student_card",
            FileName = "card.jpg",
            FileUrl = "https://r2/card.jpg",
            PublicId = "kyc/5/card.jpg",
            FileType = "image/jpeg",
            FileSize = 1000,
            UploadedAt = DateTime.UtcNow.AddYears(-2)
        };
        dbContext.IdentityDocuments.Add(doc);
        await dbContext.SaveChangesAsync();

        var service = new KycService(dbContext, _storageMock.Object, _loggerMock.Object);

        // Act
        var result = await service.GetKycStatusAsync(5);

        // Assert
        Assert.Equal("expired", result.KycStatus);
        Assert.Equal("Đại học FPT", result.School);
        Assert.Equal("HE123456", result.StudentIdNumber);
        Assert.Equal(pastYear, result.GraduationYear);
    }

    [Fact]
    public async Task GetKycStatusAsync_WhenRejectedByAdmin_ShouldReturnRejectedWithReason()
    {
        // Arrange: mô phỏng đúng trạng thái sau khi AdminUserService.VerifyKycAsync từ chối eKYC
        using var dbContext = CreateInMemoryDbContext();
        var user = new User
        {
            Id = 6,
            FullName = "Công ty TNHH Test",
            Email = "employer@skillbridge.vn",
            PasswordHash = "hashed",
            RoleId = 3,
            AccountStatus = "pending",
            KycStatus = "rejected",
            KycRejectionReason = "Giấy phép kinh doanh không hợp lệ",
            ReliabilityScore = 70
        };
        dbContext.Users.Add(user);
        dbContext.IdentityDocuments.Add(new IdentityDocument
        {
            Id = 10,
            UserId = 6,
            DocType = "business_license",
            FileName = "gpkd.jpg",
            FileUrl = "identity_documents/6/gpkd.jpg",
            PublicId = "gpkd_10",
            FileType = "image/jpeg",
            FileSize = 1024,
            UploadedAt = DateTime.UtcNow
        });
        await dbContext.SaveChangesAsync();

        var service = new KycService(dbContext, _storageMock.Object, _loggerMock.Object);

        // Act
        var result = await service.GetKycStatusAsync(6);

        // Assert: frontend chỉ hiện banner "Cần nộp lại hồ sơ" đúng khi hai field này đúng
        Assert.Equal("rejected", result.KycStatus);
        Assert.Equal("Giấy phép kinh doanh không hợp lệ", result.KycRejectionReason);
    }

    [Fact]
    public async Task SubmitKycAsync_AfterRejection_ShouldAllowResubmitAndClearRejectionReason()
    {
        // Arrange: user đã bị admin từ chối eKYC trước đó
        using var dbContext = CreateInMemoryDbContext();
        var user = new User
        {
            Id = 7,
            FullName = "Công ty TNHH Resubmit",
            Email = "employer2@skillbridge.vn",
            PasswordHash = "hashed",
            RoleId = 3,
            AccountStatus = "pending",
            KycStatus = "rejected",
            KycRejectionReason = "Ảnh giấy phép kinh doanh bị mờ",
            ReliabilityScore = 70
        };
        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();

        var service = new KycService(dbContext, _storageMock.Object, _loggerMock.Object);
        _storageMock
            .Setup(s => s.UploadStreamAsync(It.IsAny<Stream>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FileUploadResult { FileKey = "identity_documents/7/gpkd_new.jpg", FileUrl = "identity_documents/7/gpkd_new.jpg" });

        var fileBytes = Encoding.UTF8.GetBytes("fake image content");
        var files = new List<KycFileUploadModel>
        {
            new KycFileUploadModel
            {
                FileStream = new MemoryStream(fileBytes),
                FileName = "gpkd_new.jpg",
                ContentType = "image/jpeg",
                Length = fileBytes.Length,
                DocType = "business_license"
            }
        };

        // Act: nộp lại hồ sơ sau khi bị từ chối không được chặn (khác với pending/verified)
        var result = await service.SubmitKycAsync(7, new SubmitKycRequest { DocumentType = "business_license", CompanyName = "Công ty TNHH Resubmit" }, files);

        // Assert
        Assert.Equal("pending", result.KycStatus);
        var updatedUser = await dbContext.Users.FindAsync(7);
        Assert.NotNull(updatedUser);
        Assert.Equal("pending", updatedUser.KycStatus);
        Assert.Null(updatedUser.KycRejectionReason);
    }
}
