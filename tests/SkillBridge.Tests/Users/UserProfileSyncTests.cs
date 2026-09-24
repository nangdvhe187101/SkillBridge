using System;
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

public class UserProfileSyncTests
{
    private readonly Mock<IStorageService> _storageMock = new();
    private readonly Mock<ILogger<UserService>> _loggerMock = new();

    private SkillBridgeDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<SkillBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new SkillBridgeDbContext(options);
    }

    [Fact]
    public async Task GetPortfolioAsync_WhenStudentHasUploads_ShouldReturnOrderedList()
    {
        using var dbContext = CreateInMemoryDbContext();
        dbContext.PortfolioUploads.AddRange(
            new PortfolioUpload
            {
                Id = 1,
                StudentId = 10,
                FileName = "project1.png",
                FileType = "image/png",
                FileUrl = "portfolios/project1.png",
                UploadedAt = DateTime.UtcNow.AddDays(-1)
            },
            new PortfolioUpload
            {
                Id = 2,
                StudentId = 10,
                FileName = "project2.png",
                FileType = "image/png",
                FileUrl = "portfolios/project2.png",
                UploadedAt = DateTime.UtcNow
            },
            new PortfolioUpload
            {
                Id = 3,
                StudentId = 99,
                FileName = "other.png",
                FileType = "image/png",
                FileUrl = "portfolios/other.png",
                UploadedAt = DateTime.UtcNow
            }
        );
        await dbContext.SaveChangesAsync();

        _storageMock.Setup(s => s.GetPublicUrl(It.IsAny<string>()))
            .Returns<string>(k => $"https://cdn.skillbridge.vn/{k}");

        var service = new UserService(dbContext, _storageMock.Object, _loggerMock.Object);

        var result = await service.GetPortfolioAsync(10);

        Assert.Equal(2, result.Count);
        Assert.Equal(2, result[0].Id); // Most recent first
        Assert.Equal("project2.png", result[0].FileName);
        Assert.Equal("https://cdn.skillbridge.vn/portfolios/project2.png", result[0].FileUrl);
    }

    [Fact]
    public async Task UploadPortfolioAsync_ValidFile_ShouldPersistAndReturnItem()
    {
        using var dbContext = CreateInMemoryDbContext();
        dbContext.Users.Add(new User
        {
            Id = 5,
            FullName = "Sinh Viên Test",
            Email = "student5@test.com",
            PasswordHash = "hash",
            AccountStatus = "active",
            KycStatus = "verified"
        });
        await dbContext.SaveChangesAsync();

        _storageMock.Setup(s => s.UploadStreamAsync(
                It.IsAny<Stream>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                "portfolios",
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FileUploadResult
            {
                FileKey = "portfolios/mock-key.png",
                FileUrl = "https://cdn.skillbridge.vn/portfolios/mock-key.png"
            });

        var service = new UserService(dbContext, _storageMock.Object, _loggerMock.Object);
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes("fake-image-bytes"));

        var result = await service.UploadPortfolioAsync(5, stream, "design.png", "image/png");

        Assert.NotNull(result);
        Assert.Equal("design.png", result.FileName);
        Assert.Equal("https://cdn.skillbridge.vn/portfolios/mock-key.png", result.FileUrl);

        var inDb = await dbContext.PortfolioUploads.FirstOrDefaultAsync(p => p.StudentId == 5);
        Assert.NotNull(inDb);
        Assert.Equal("design.png", inDb.FileName);
    }

    [Fact]
    public async Task DeletePortfolioAsync_WhenNotOwner_ShouldThrowForbidden()
    {
        using var dbContext = CreateInMemoryDbContext();
        dbContext.PortfolioUploads.Add(new PortfolioUpload
        {
            Id = 1,
            StudentId = 10,
            FileName = "secret.png",
            FileType = "image/png"
        });
        await dbContext.SaveChangesAsync();

        var service = new UserService(dbContext, _storageMock.Object, _loggerMock.Object);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => service.DeletePortfolioAsync(99, 1));
        Assert.Contains("Bạn không có quyền", ex.Message);
    }

    [Fact]
    public async Task DeletePortfolioAsync_WhenOwner_ShouldRemoveSuccessfully()
    {
        using var dbContext = CreateInMemoryDbContext();
        dbContext.PortfolioUploads.Add(new PortfolioUpload
        {
            Id = 2,
            StudentId = 10,
            FileName = "todelete.png",
            FileType = "image/png",
            FileUrl = "portfolios/todelete.png"
        });
        await dbContext.SaveChangesAsync();

        var service = new UserService(dbContext, _storageMock.Object, _loggerMock.Object);

        await service.DeletePortfolioAsync(10, 2);

        var inDb = await dbContext.PortfolioUploads.FindAsync(2);
        Assert.Null(inDb);
        _storageMock.Verify(s => s.DeleteFileAsync("portfolios/todelete.png", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetUserBadgesAsync_WhenHasBadges_ShouldReturnMappedBadges()
    {
        using var dbContext = CreateInMemoryDbContext();
        var category = new Category { Id = 1, Name = "Thiết kế đồ họa", PreviewStrategy = "watermark_image" };
        var badge = new SkillBadge { Id = 100, Name = "Photoshop Master", Description = "Thành thạo Photoshop", Category = category };
        dbContext.SkillBadges.Add(badge);
        dbContext.UserBadges.Add(new UserBadge
        {
            Id = 1,
            UserId = 7,
            BadgeId = 100,
            Badge = badge,
            GrantedReason = "Hoàn thành 5 dự án 5 sao",
            GrantedAt = DateTime.UtcNow
        });
        await dbContext.SaveChangesAsync();

        var service = new UserService(dbContext, _storageMock.Object, _loggerMock.Object);

        var result = await service.GetUserBadgesAsync(7);

        Assert.Single(result);
        Assert.Equal("Photoshop Master", result[0].Name);
        Assert.Equal("Thiết kế đồ họa", result[0].CategoryName);
        Assert.Equal("Hoàn thành 5 dự án 5 sao", result[0].GrantedReason);
    }
}
