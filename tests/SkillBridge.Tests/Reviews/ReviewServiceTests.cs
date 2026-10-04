using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Reviews;
using SkillBridge.Application.Interfaces.Notifications;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Services.Reviews;
using Xunit;

namespace SkillBridge.Tests.Reviews;

public class ReviewServiceTests
{
    private readonly Mock<INotificationService> _notificationMock = new();
    private readonly Mock<ILogger<ReviewService>> _loggerMock = new();

    private SkillBridgeDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<SkillBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new SkillBridgeDbContext(options);
    }

    [Fact]
    public async Task CreateReviewAsync_StudentWithin3Days_Awards5BonusPoints()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var student = new User { Id = 10, FullName = "Nguyễn Văn Sinh Viên", Email = "sv@test.com", ReliabilityScore = 80, RoleId = 1, PasswordHash = "x", AccountStatus = "active", KycStatus = "verified" };
        var employer = new User { Id = 20, FullName = "Công ty ABC", Email = "abc@test.com", ReliabilityScore = 90, RoleId = 2, PasswordHash = "x", AccountStatus = "active", KycStatus = "verified" };
        
        var job = new Job
        {
            Id = 100,
            Title = "Thiết kế Website Landing Page",
            Description = "Mô tả công việc",
            EmployerId = 20,
            HiredApplicantId = 10,
            Budget = 2000000,
            CategoryId = 1,
            Status = "completed",
            PostedAt = DateTime.UtcNow.AddDays(-10),
            UpdatedAt = DateTime.UtcNow.AddHours(-24) // Hoàn thành cách đây 24 giờ (trong hạn 3 ngày)
        };

        dbContext.Users.AddRange(student, employer);
        dbContext.Jobs.Add(job);
        await dbContext.SaveChangesAsync();

        var service = new ReviewService(dbContext, _notificationMock.Object, _loggerMock.Object);

        // Act
        var result = await service.CreateReviewAsync(10, new CreateReviewRequest
        {
            JobId = 100,
            Stars = 5,
            Comment = "Nhà tuyển dụng rất tốt!"
        });

        // Assert
        Assert.NotNull(result);
        Assert.True(result.EarnedBonusPoints);
        Assert.Equal(5, result.BonusPoints);
        Assert.NotNull(result.BonusMessage);

        var updatedStudent = await dbContext.Users.FindAsync(10);
        Assert.NotNull(updatedStudent);
        Assert.Equal(85, updatedStudent.ReliabilityScore); // 80 + 5

        var updatedEmployer = await dbContext.Users.FindAsync(20);
        Assert.NotNull(updatedEmployer);
        Assert.Equal(92, updatedEmployer.ReliabilityScore); // 90 + 2 (do nhận 5 sao)
    }

    [Fact]
    public async Task CreateReviewAsync_StudentAfter3Days_CreatesReviewWithoutBonus()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var student = new User { Id = 11, FullName = "Trần Thị B", Email = "b@test.com", ReliabilityScore = 75, RoleId = 1, PasswordHash = "x", AccountStatus = "active", KycStatus = "verified" };
        var employer = new User { Id = 21, FullName = "Công ty XYZ", Email = "xyz@test.com", ReliabilityScore = 88, RoleId = 2, PasswordHash = "x", AccountStatus = "active", KycStatus = "verified" };
        
        var job = new Job
        {
            Id = 101,
            Title = "Viết bài chuẩn SEO",
            Description = "Mô tả",
            EmployerId = 21,
            HiredApplicantId = 11,
            Budget = 1000000,
            CategoryId = 1,
            Status = "completed",
            PostedAt = DateTime.UtcNow.AddDays(-20),
            UpdatedAt = DateTime.UtcNow.AddDays(-5) // Hoàn thành cách đây 5 ngày (> 3 ngày)
        };

        dbContext.Users.AddRange(student, employer);
        dbContext.Jobs.Add(job);
        await dbContext.SaveChangesAsync();

        var service = new ReviewService(dbContext, _notificationMock.Object, _loggerMock.Object);

        // Act
        var result = await service.CreateReviewAsync(11, new CreateReviewRequest
        {
            JobId = 101,
            Stars = 5,
            Comment = "Đánh giá muộn sau 5 ngày."
        });

        // Assert - Vẫn tạo review thành công nhưng không cộng 5 điểm thưởng
        Assert.NotNull(result);
        Assert.False(result.EarnedBonusPoints);
        Assert.Equal(0, result.BonusPoints);

        var updatedStudent = await dbContext.Users.FindAsync(11);
        Assert.NotNull(updatedStudent);
        Assert.Equal(75, updatedStudent.ReliabilityScore); // Điểm giữ nguyên 75, KHÔNG bị tăng thêm 5

        // Kiểm tra review đã được lưu vào database
        var savedReview = await dbContext.Reviews.FirstOrDefaultAsync(r => r.JobId == 101);
        Assert.NotNull(savedReview);
        Assert.Equal("Đánh giá muộn sau 5 ngày.", savedReview.Comment);
    }

    [Fact]
    public async Task CreateReviewAsync_StudentWithin3Days_ScoreCappedAt100()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var student = new User { Id = 12, FullName = "Lê Văn C", Email = "c@test.com", ReliabilityScore = 98, RoleId = 1, PasswordHash = "x", AccountStatus = "active", KycStatus = "verified" };
        var employer = new User { Id = 22, FullName = "Công ty 123", Email = "123@test.com", ReliabilityScore = 90, RoleId = 2, PasswordHash = "x", AccountStatus = "active", KycStatus = "verified" };
        
        var job = new Job
        {
            Id = 102,
            Title = "Dịch tài liệu tiếng Anh",
            Description = "Mô tả",
            EmployerId = 22,
            HiredApplicantId = 12,
            Budget = 1500000,
            CategoryId = 1,
            Status = "completed",
            PostedAt = DateTime.UtcNow.AddDays(-5),
            UpdatedAt = DateTime.UtcNow.AddHours(-10) // 10 giờ trước (trong hạn 3 ngày)
        };

        dbContext.Users.AddRange(student, employer);
        dbContext.Jobs.Add(job);
        await dbContext.SaveChangesAsync();

        var service = new ReviewService(dbContext, _notificationMock.Object, _loggerMock.Object);

        // Act
        var result = await service.CreateReviewAsync(12, new CreateReviewRequest
        {
            JobId = 102,
            Stars = 5,
            Comment = "Rất hài lòng"
        });

        // Assert
        Assert.True(result.EarnedBonusPoints);
        var updatedStudent = await dbContext.Users.FindAsync(12);
        Assert.NotNull(updatedStudent);
        Assert.Equal(100, updatedStudent.ReliabilityScore); // Max 100, không bị vượt quá
    }

    [Fact]
    public async Task GetJobReviewsAsync_CalculatesCanEarnBonusCorrectly()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var student = new User { Id = 13, FullName = "Võ Văn D", Email = "d@test.com", ReliabilityScore = 80, RoleId = 1, PasswordHash = "x", AccountStatus = "active", KycStatus = "verified" };
        var employer = new User { Id = 23, FullName = "Công ty ABC", Email = "abc2@test.com", ReliabilityScore = 90, RoleId = 2, PasswordHash = "x", AccountStatus = "active", KycStatus = "verified" };
        
        var freshJob = new Job
        {
            Id = 103,
            Title = "Job Mới Xong 1 ngày",
            Description = "Mô tả",
            EmployerId = 23,
            HiredApplicantId = 13,
            Budget = 500000,
            CategoryId = 1,
            Status = "completed",
            PostedAt = DateTime.UtcNow.AddDays(-5),
            UpdatedAt = DateTime.UtcNow.AddHours(-24) // 24 giờ trước
        };

        var oldJob = new Job
        {
            Id = 104,
            Title = "Job Xong 4 ngày",
            Description = "Mô tả",
            EmployerId = 23,
            HiredApplicantId = 13,
            Budget = 500000,
            CategoryId = 1,
            Status = "completed",
            PostedAt = DateTime.UtcNow.AddDays(-10),
            UpdatedAt = DateTime.UtcNow.AddHours(-96) // 96 giờ trước (> 72h)
        };

        dbContext.Users.AddRange(student, employer);
        dbContext.Jobs.AddRange(freshJob, oldJob);
        await dbContext.SaveChangesAsync();

        var service = new ReviewService(dbContext, _notificationMock.Object, _loggerMock.Object);

        // Act
        var freshSummary = await service.GetJobReviewsAsync(103, 13);
        var oldSummary = await service.GetJobReviewsAsync(104, 13);

        // Assert
        Assert.True(freshSummary.CanEarnBonusPoints);
        Assert.True(freshSummary.HoursRemainingForBonus > 40 && freshSummary.HoursRemainingForBonus <= 48);

        Assert.False(oldSummary.CanEarnBonusPoints);
        Assert.Equal(0, oldSummary.HoursRemainingForBonus);
    }
}
