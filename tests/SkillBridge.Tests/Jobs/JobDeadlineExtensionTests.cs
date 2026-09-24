using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Jobs;
using SkillBridge.Application.Interfaces.Notifications;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Services.Jobs;
using Xunit;

namespace SkillBridge.Tests.Jobs;

public class JobDeadlineExtensionTests
{
    private readonly Mock<INotificationService> _notificationMock = new();
    private readonly Mock<ILogger<JobDeadlineExtensionService>> _loggerMock = new();

    private SkillBridgeDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<SkillBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new SkillBridgeDbContext(options);
    }

    private static User CreateUser(int id, string name, string role = "student") => new()
    {
        Id = id,
        FullName = name,
        Email = $"{id}_{role}@skillbridge.vn",
        PasswordHash = "hash",
        RoleId = role == "employer" ? 1 : 2,
        AccountStatus = "active",
        KycStatus = "verified"
    };

    [Fact]
    public async Task RequestExtensionAsync_WhenJobNotFound_ShouldThrowBusinessException()
    {
        using var db = CreateInMemoryDbContext();
        var service = new JobDeadlineExtensionService(db, _notificationMock.Object, _loggerMock.Object);

        var request = new CreateDeadlineExtensionRequest
        {
            AdditionalDays = 3,
            ReasonCategory = "Kỹ thuật",
            DetailReason = "Cần thêm thời gian kiểm thử hiệu năng"
        };

        var ex = await Assert.ThrowsAsync<BusinessException>(() => service.RequestExtensionAsync(1, 999, request));
        Assert.Contains("Không tìm thấy công việc", ex.Message);
    }

    [Fact]
    public async Task RequestExtensionAsync_WhenNotHiredStudent_ShouldThrowUnauthorizedAccessException()
    {
        using var db = CreateInMemoryDbContext();
        var employer = CreateUser(10, "Nhà Tuyển Dụng", "employer");
        var student = CreateUser(20, "Sinh Viên 20", "student");
        var job = new Job
        {
            Id = 1,
            Title = "Job Test",
            Description = "Mô tả",
            EmployerId = 10,
            HiredApplicantId = 20,
            Status = "in_progress",
            PostedAt = DateTime.UtcNow.AddDays(-5),
            DeadlineAt = DateTime.UtcNow.AddDays(5)
        };
        await db.Users.AddRangeAsync(employer, student);
        await db.Jobs.AddAsync(job);
        await db.SaveChangesAsync();

        var service = new JobDeadlineExtensionService(db, _notificationMock.Object, _loggerMock.Object);

        var request = new CreateDeadlineExtensionRequest
        {
            AdditionalDays = 2,
            ReasonCategory = "Kỹ thuật",
            DetailReason = "Cần thêm thời gian hoàn thiện dự án"
        };

        // User 99 is not hired applicant 20
        var ex = await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.RequestExtensionAsync(99, 1, request));
        Assert.Contains("Bạn không có quyền", ex.Message);
    }

    [Fact]
    public async Task RequestExtensionAsync_WhenDaysExceed50Percent_ShouldThrowBusinessException()
    {
        using var db = CreateInMemoryDbContext();
        var employer = CreateUser(10, "Nhà Tuyển Dụng", "employer");
        var student = CreateUser(20, "Sinh Viên 20", "student");
        // Total days: Posted 10 days ago, deadline in 0 days => total duration 10 days. 50% = 5 days.
        var job = new Job
        {
            Id = 1,
            Title = "Job Test",
            Description = "Mô tả",
            EmployerId = 10,
            HiredApplicantId = 20,
            Status = "in_progress",
            PostedAt = DateTime.UtcNow.AddDays(-10),
            DeadlineAt = DateTime.UtcNow.AddDays(0)
        };
        await db.Users.AddRangeAsync(employer, student);
        await db.Jobs.AddAsync(job);
        await db.SaveChangesAsync();

        var service = new JobDeadlineExtensionService(db, _notificationMock.Object, _loggerMock.Object);

        var request = new CreateDeadlineExtensionRequest
        {
            AdditionalDays = 6, // Exceeds 5 days
            ReasonCategory = "Kỹ thuật",
            DetailReason = "Cần thêm thời gian hoàn thiện dự án"
        };

        var ex = await Assert.ThrowsAsync<BusinessException>(() => service.RequestExtensionAsync(20, 1, request));
        Assert.Contains("không được vượt quá 50%", ex.Message);
    }

    [Fact]
    public async Task RequestExtensionAsync_WhenExtensionCountAlready2_ShouldThrowBusinessException()
    {
        using var db = CreateInMemoryDbContext();
        var employer = CreateUser(10, "Nhà Tuyển Dụng", "employer");
        var student = CreateUser(20, "Sinh Viên 20", "student");
        var job = new Job
        {
            Id = 1,
            Title = "Job Test",
            Description = "Mô tả",
            EmployerId = 10,
            HiredApplicantId = 20,
            Status = "in_progress",
            ExtensionCount = 2,
            PostedAt = DateTime.UtcNow.AddDays(-10),
            DeadlineAt = DateTime.UtcNow.AddDays(5)
        };
        await db.Users.AddRangeAsync(employer, student);
        await db.Jobs.AddAsync(job);
        await db.SaveChangesAsync();

        var service = new JobDeadlineExtensionService(db, _notificationMock.Object, _loggerMock.Object);

        var request = new CreateDeadlineExtensionRequest
        {
            AdditionalDays = 2,
            ReasonCategory = "Kỹ thuật",
            DetailReason = "Cần thêm thời gian hoàn thiện dự án"
        };

        var ex = await Assert.ThrowsAsync<BusinessException>(() => service.RequestExtensionAsync(20, 1, request));
        Assert.Contains("tối đa 02 lần gia hạn", ex.Message);
    }

    [Fact]
    public async Task RequestExtensionAsync_WhenPendingAlreadyExists_ShouldThrowBusinessException()
    {
        using var db = CreateInMemoryDbContext();
        var employer = CreateUser(10, "Nhà Tuyển Dụng", "employer");
        var student = CreateUser(20, "Sinh Viên 20", "student");
        var job = new Job
        {
            Id = 1,
            Title = "Job Test",
            Description = "Mô tả",
            EmployerId = 10,
            HiredApplicantId = 20,
            Status = "in_progress",
            ExtensionCount = 0,
            PostedAt = DateTime.UtcNow.AddDays(-10),
            DeadlineAt = DateTime.UtcNow.AddDays(5)
        };
        var existingExt = new JobDeadlineExtension
        {
            JobId = 1,
            StudentId = 20,
            AdditionalDays = 2,
            ReasonCategory = "Kỹ thuật",
            DetailReason = "Đang chờ duyệt lần 1",
            Status = "pending",
            CurrentDeadline = DateTime.UtcNow,
            ProposedDeadline = DateTime.UtcNow.AddDays(2),
            RequestedAt = DateTime.UtcNow
        };
        await db.Users.AddRangeAsync(employer, student);
        await db.Jobs.AddAsync(job);
        await db.JobDeadlineExtensions.AddAsync(existingExt);
        await db.SaveChangesAsync();

        var service = new JobDeadlineExtensionService(db, _notificationMock.Object, _loggerMock.Object);

        var request = new CreateDeadlineExtensionRequest
        {
            AdditionalDays = 2,
            ReasonCategory = "Kỹ thuật",
            DetailReason = "Cần thêm thời gian hoàn thiện dự án"
        };

        var ex = await Assert.ThrowsAsync<BusinessException>(() => service.RequestExtensionAsync(20, 1, request));
        Assert.Contains("Đang có một yêu cầu xin gia hạn chờ phản hồi", ex.Message);
    }

    [Fact]
    public async Task RequestExtensionAsync_WhenValid_ShouldCreatePendingAndNotifyEmployer()
    {
        using var db = CreateInMemoryDbContext();
        var employer = CreateUser(10, "Nhà Tuyển Dụng", "employer");
        var student = CreateUser(20, "Nguyễn Văn Sinh Viên", "student");
        var job = new Job
        {
            Id = 1,
            Title = "Xây dựng Web SkillBridge",
            Description = "Mô tả",
            EmployerId = 10,
            HiredApplicantId = 20,
            Status = "in_progress",
            ExtensionCount = 0,
            PostedAt = DateTime.UtcNow.AddDays(-10),
            DeadlineAt = DateTime.UtcNow.AddDays(5)
        };
        await db.Users.AddRangeAsync(employer, student);
        await db.Jobs.AddAsync(job);
        await db.SaveChangesAsync();

        var service = new JobDeadlineExtensionService(db, _notificationMock.Object, _loggerMock.Object);

        var request = new CreateDeadlineExtensionRequest
        {
            AdditionalDays = 3,
            ReasonCategory = "Kỹ thuật",
            DetailReason = "Cần tối ưu giao diện và kết nối API thật"
        };

        var res = await service.RequestExtensionAsync(20, 1, request);

        Assert.NotNull(res);
        Assert.Equal(1, res.JobId);
        Assert.Equal("pending", res.Status);
        Assert.Equal(3, res.AdditionalDays);
        Assert.Equal("Xây dựng Web SkillBridge", res.JobTitle);

        // Verify saved in DB
        var savedInDb = await db.JobDeadlineExtensions.FirstOrDefaultAsync(e => e.JobId == 1 && e.Status == "pending");
        Assert.NotNull(savedInDb);
        Assert.Equal(3, savedInDb.AdditionalDays);

        // Verify notification sent to employer 10
        _notificationMock.Verify(n => n.SendAsync(
            10,
            It.IsAny<string>(),
            It.Is<string>(msg => msg.Contains("3 ngày")),
            It.IsAny<string>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RespondExtensionAsync_WhenAccept_ShouldUpdateDeadlineAndIncrementCount()
    {
        using var db = CreateInMemoryDbContext();
        var employer = CreateUser(10, "Nhà Tuyển Dụng", "employer");
        var student = CreateUser(20, "Sinh Viên 20", "student");
        var oldDeadline = DateTime.UtcNow.AddDays(2);
        var newDeadline = oldDeadline.AddDays(3);

        var job = new Job
        {
            Id = 1,
            Title = "Job Test",
            Description = "Mô tả",
            EmployerId = 10,
            HiredApplicantId = 20,
            Status = "in_progress",
            ExtensionCount = 0,
            DeadlineAt = oldDeadline,
            PostedAt = DateTime.UtcNow.AddDays(-10)
        };
        var ext = new JobDeadlineExtension
        {
            Id = 100,
            JobId = 1,
            StudentId = 20,
            AdditionalDays = 3,
            CurrentDeadline = oldDeadline,
            ProposedDeadline = newDeadline,
            ReasonCategory = "Kỹ thuật",
            DetailReason = "Lý do hợp lý",
            Status = "pending",
            RequestedAt = DateTime.UtcNow
        };
        await db.Users.AddRangeAsync(employer, student);
        await db.Jobs.AddAsync(job);
        await db.JobDeadlineExtensions.AddAsync(ext);
        await db.SaveChangesAsync();

        var service = new JobDeadlineExtensionService(db, _notificationMock.Object, _loggerMock.Object);

        var respondRequest = new RespondDeadlineExtensionRequest
        {
            Action = "accept"
        };

        await service.RespondExtensionAsync(10, 1, 100, respondRequest);

        var updatedJob = await db.Jobs.FindAsync(1);
        Assert.NotNull(updatedJob);
        Assert.Equal(1, updatedJob.ExtensionCount);
        Assert.Equal(newDeadline, updatedJob.DeadlineAt);

        var updatedExt = await db.JobDeadlineExtensions.FindAsync(100);
        Assert.NotNull(updatedExt);
        Assert.Equal("accepted", updatedExt.Status);
        Assert.NotNull(updatedExt.RespondedAt);

        // Verify notification sent to student 20
        _notificationMock.Verify(n => n.SendAsync(
            20,
            "✅",
            It.Is<string>(msg => msg.Contains("đã chấp thuận")),
            It.IsAny<string>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RespondExtensionAsync_WhenReject_ShouldKeepDeadlineAndSetReason()
    {
        using var db = CreateInMemoryDbContext();
        var employer = CreateUser(10, "Nhà Tuyển Dụng", "employer");
        var student = CreateUser(20, "Sinh Viên 20", "student");
        var oldDeadline = DateTime.UtcNow.AddDays(2);
        var newDeadline = oldDeadline.AddDays(3);

        var job = new Job
        {
            Id = 1,
            Title = "Job Test",
            Description = "Mô tả",
            EmployerId = 10,
            HiredApplicantId = 20,
            Status = "in_progress",
            ExtensionCount = 0,
            DeadlineAt = oldDeadline,
            PostedAt = DateTime.UtcNow.AddDays(-10)
        };
        var ext = new JobDeadlineExtension
        {
            Id = 100,
            JobId = 1,
            StudentId = 20,
            AdditionalDays = 3,
            CurrentDeadline = oldDeadline,
            ProposedDeadline = newDeadline,
            ReasonCategory = "Kỹ thuật",
            DetailReason = "Lý do hợp lý",
            Status = "pending",
            RequestedAt = DateTime.UtcNow
        };
        await db.Users.AddRangeAsync(employer, student);
        await db.Jobs.AddAsync(job);
        await db.JobDeadlineExtensions.AddAsync(ext);
        await db.SaveChangesAsync();

        var service = new JobDeadlineExtensionService(db, _notificationMock.Object, _loggerMock.Object);

        var respondRequest = new RespondDeadlineExtensionRequest
        {
            Action = "reject",
            RejectionReason = "Tiến độ công ty đang rất gấp, không thể gia hạn"
        };

        await service.RespondExtensionAsync(10, 1, 100, respondRequest);

        var updatedJob = await db.Jobs.FindAsync(1);
        Assert.NotNull(updatedJob);
        Assert.Equal(0, updatedJob.ExtensionCount);
        Assert.Equal(oldDeadline, updatedJob.DeadlineAt); // Kept original deadline

        var updatedExt = await db.JobDeadlineExtensions.FindAsync(100);
        Assert.NotNull(updatedExt);
        Assert.Equal("rejected", updatedExt.Status);
        Assert.Equal("Tiến độ công ty đang rất gấp, không thể gia hạn", updatedExt.RejectionReason);

        // Verify notification sent to student 20
        _notificationMock.Verify(n => n.SendAsync(
            20,
            "❌",
            It.Is<string>(msg => msg.Contains("đã bị từ chối")),
            It.IsAny<string>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CancelExtensionAsync_WhenPending_ShouldSetStatusCancelled()
    {
        using var db = CreateInMemoryDbContext();
        var employer = CreateUser(10, "Nhà Tuyển Dụng", "employer");
        var student = CreateUser(20, "Sinh Viên 20", "student");
        var ext = new JobDeadlineExtension
        {
            Id = 100,
            JobId = 1,
            StudentId = 20,
            AdditionalDays = 3,
            CurrentDeadline = DateTime.UtcNow,
            ProposedDeadline = DateTime.UtcNow.AddDays(3),
            ReasonCategory = "Kỹ thuật",
            DetailReason = "Muốn hủy",
            Status = "pending",
            RequestedAt = DateTime.UtcNow
        };
        await db.Users.AddRangeAsync(employer, student);
        await db.JobDeadlineExtensions.AddAsync(ext);
        await db.SaveChangesAsync();

        var service = new JobDeadlineExtensionService(db, _notificationMock.Object, _loggerMock.Object);

        await service.CancelExtensionAsync(20, 1, 100);

        var updated = await db.JobDeadlineExtensions.FindAsync(100);
        Assert.NotNull(updated);
        Assert.Equal("cancelled", updated.Status);
    }
}
