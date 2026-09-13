using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs;
using SkillBridge.Application.Interfaces;
using SkillBridge.Application.Interfaces.Auth;
using SkillBridge.Application.Interfaces.Email;
using SkillBridge.Application.Interfaces.Notifications;
using SkillBridge.Application.Interfaces.Payments;
using SkillBridge.Application.Interfaces.Storage;
using SkillBridge.Application.Interfaces.Users;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Repositories.Interfaces;
using SkillBridge.Infrastructure.Services;
using SkillBridge.Infrastructure.Services.Applications;
using SkillBridge.Infrastructure.Services.Email;
using SkillBridge.Infrastructure.Services.Jobs;
using SkillBridge.Infrastructure.Services.Notifications;
using Xunit;

namespace SkillBridge.Tests.Jobs;

public class BugFixesRegressionTests
{
    private SkillBridgeDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<SkillBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new SkillBridgeDbContext(options);
    }

    [Fact]
    public async Task DeleteJobAttachmentAsync_ShouldDeleteDbRecordBeforeStorage()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var storageMock = new Mock<IStorageService>();
        var loggerMock = new Mock<ILogger<JobAttachmentService>>();

        var job = new Job
        {
            Id = 1,
            EmployerId = 10,
            Title = "Job 1",
            Description = "Mô tả công việc",
            Status = "open"
        };
        var attachment = new JobAttachment
        {
            Id = 101,
            JobId = 1,
            FileName = "spec.pdf",
            FileType = "pdf",
            FileUrl = "https://r2.storage.com/job-attachments/1/spec.pdf"
        };
        await dbContext.Jobs.AddAsync(job);
        await dbContext.JobAttachments.AddAsync(attachment);
        await dbContext.SaveChangesAsync();

        var callOrder = 0;
        var storageDeleteOrder = 0;

        storageMock.Setup(s => s.DeleteFileAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Callback(() =>
            {
                storageDeleteOrder = ++callOrder;
                // Kiểm tra tại thời điểm gọi storage delete, DB record đã bị xóa khỏi DbContext
                var existsInDb = dbContext.JobAttachments.Find(101) != null;
                Assert.False(existsInDb);
            })
            .ReturnsAsync(true);

        var service = new JobAttachmentService(dbContext, storageMock.Object, loggerMock.Object);

        // Act
        await service.DeleteJobAttachmentAsync(10, 1, 101);

        // Assert
        Assert.Null(await dbContext.JobAttachments.FindAsync(101));
        storageMock.Verify(s => s.DeleteFileAsync("job-attachments/1/spec.pdf", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DeleteCvAsync_ShouldDeleteDbRecordBeforeStorage()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var cvRepoMock = new Mock<ICvFileRepository>();
        var catRepoMock = new Mock<ICategoryRepository>();
        var storageMock = new Mock<IStorageService>();
        var loggerMock = new Mock<ILogger<CvService>>();

        var cv = new CvFile
        {
            Id = 50,
            StudentId = 20,
            FileName = "my_cv.pdf",
            PublicId = "cvs/student20/my_cv.pdf"
        };

        cvRepoMock.Setup(r => r.GetByIdAsync(50)).ReturnsAsync(cv);

        var callSequence = 0;
        var repoDeleteOrder = 0;
        var storageDeleteOrder = 0;

        cvRepoMock.Setup(r => r.DeleteAsync(cv))
            .Callback(() => { repoDeleteOrder = ++callSequence; })
            .Returns(Task.CompletedTask);

        storageMock.Setup(s => s.DeleteFileAsync(cv.PublicId, It.IsAny<CancellationToken>()))
            .Callback(() => { storageDeleteOrder = ++callSequence; })
            .ReturnsAsync(true);

        var service = new CvService(
            cvRepoMock.Object,
            catRepoMock.Object,
            storageMock.Object,
            dbContext,
            loggerMock.Object);

        // Act
        await service.DeleteCvAsync(20, 50);

        // Assert
        Assert.True(repoDeleteOrder > 0, "DB repo delete must be called.");
        Assert.True(storageDeleteOrder > 0, "Storage delete must be called.");
        Assert.True(repoDeleteOrder < storageDeleteOrder, "DB repo delete MUST be called BEFORE storage delete.");
    }

    [Fact]
    public async Task RefreshToken_WhenReusedBeyondGraceWindow_ShouldInvalidateTokensAndBumpTokenVersion()
    {
        // Arrange
        var authRepoMock = new Mock<IAuthTokenRepository>();
        var jwtMock = new Mock<IJwtService>();
        var storageMock = new Mock<IStorageService>();
        var tokenVersionMock = new Mock<ITokenVersionService>();

        var user = new User
        {
            Id = 99,
            Email = "user@test.com",
            TokenVersion = 1,
            AccountStatus = "active",
            Role = new Role { Code = "student" }
        };

        var expiredReusedToken = new AuthToken
        {
            Id = 1,
            UserId = 99,
            User = user,
            UsedAt = DateTime.UtcNow.AddMinutes(-5), // Ngoài grace window 30s
            ExpiresAt = DateTime.UtcNow.AddDays(1)
        };

        authRepoMock.Setup(r => r.GetTokenByHashAsync(It.IsAny<string>(), TokenTypes.Refresh))
            .ReturnsAsync(expiredReusedToken);

        var service = new RefreshTokenService(
            authRepoMock.Object,
            jwtMock.Object,
            storageMock.Object,
            tokenVersionMock.Object);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() => service.RefreshAsync("reused_token"));
        Assert.Contains("thu hồi do phát hiện bất thường", ex.Message);

        // Verify TokenVersion was bumped and cache updated
        Assert.Equal(2, user.TokenVersion);
        tokenVersionMock.Verify(t => t.InvalidateOrUpdateVersionAsync(99, 2), Times.Once);
        authRepoMock.Verify(r => r.InvalidateAllActiveTokensAsync(99, TokenTypes.Refresh), Times.Once);
        authRepoMock.Verify(r => r.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task ResendVerificationAsync_DuringCooldown_ShouldReturnGenericMessageSilently()
    {
        // Arrange
        var userRepoMock = new Mock<IUserRepository>();
        var authRepoMock = new Mock<IAuthTokenRepository>();
        var emailMock = new Mock<IEmailService>();
        var jwtMock = new Mock<IJwtService>();
        var loggerMock = new Mock<ILogger<ResendVerificationService>>();

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new System.Collections.Generic.Dictionary<string, string?>
            {
                ["Auth:ResendVerificationCooldownSeconds"] = "60"
            })
            .Build();

        var pendingUser = new User
        {
            Id = 15,
            Email = "pending@test.com",
            FullName = "Pending User",
            AccountStatus = "pending"
        };

        var recentToken = new AuthToken
        {
            Id = 88,
            UserId = 15,
            TokenType = TokenTypes.EmailVerify,
            CreatedAt = DateTime.UtcNow.AddSeconds(-20) // Mới tạo cách đây 20s, còn trong cooldown 60s
        };

        userRepoMock.Setup(u => u.GetByEmailAsync("pending@test.com")).ReturnsAsync(pendingUser);
        authRepoMock.Setup(a => a.GetLatestTokenByUserAsync(15, TokenTypes.EmailVerify)).ReturnsAsync(recentToken);

        var service = new ResendVerificationService(
            userRepoMock.Object,
            authRepoMock.Object,
            emailMock.Object,
            jwtMock.Object,
            config,
            loggerMock.Object);

        // Act
        var result = await service.ResendAsync("pending@test.com");

        // Assert
        Assert.Equal("Nếu email tồn tại và chưa xác thực, chúng tôi đã gửi link xác thực", result);
        // Không được gửi email mới
        emailMock.Verify(e => e.SendVerificationEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task NotificationService_SendAsync_ShouldSaveNotificationToDbDirectly()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var loggerMock = new Mock<ILogger<NotificationService>>();

        var service = new NotificationService(dbContext, loggerMock.Object);

        // Act
        await service.SendAsync(77, "🔔", "Kiểm tra tự động lưu thông báo", "/test");

        // Assert - query lại trực tiếp từ DbContext để kiểm tra entity đã thực sự được persist
        var savedNotif = await dbContext.Notifications.FirstOrDefaultAsync(n => n.UserId == 77);
        Assert.NotNull(savedNotif);
        Assert.Equal("🔔", savedNotif.Icon);
        Assert.Equal("Kiểm tra tự động lưu thông báo", savedNotif.MessageText);
        Assert.Equal("/test", savedNotif.Link);
        Assert.False(savedNotif.IsRead);
    }

    [Fact]
    public async Task CancelOrWithdrawApplication_WhenHiredAndInProgress_ShouldPenalizeScoreRefundAndReopenJob()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var appRepoMock = new Mock<IApplicationRepository>();
        var jobRepoMock = new Mock<IJobRepository>();
        var cvRepoMock = new Mock<ICvFileRepository>();
        var storageMock = new Mock<IStorageService>();
        var escrowMock = new Mock<IEscrowPaymentService>();
        var reliabilityMock = new Mock<IUserReliabilityService>();
        var notifMock = new Mock<INotificationService>();
        var loggerMock = new Mock<ILogger<ApplicationService>>();

        var studentId = 5;
        var employerId = 10;
        var jobId = 100;

        var student = new User { Id = studentId, RoleId = 1, Email = "student5@test.com", FullName = "Student 5", AccountStatus = "active", KycStatus = "verified", PasswordHash = "hash" };
        var employer = new User { Id = employerId, RoleId = 2, Email = "employer10@test.com", FullName = "Employer 10", AccountStatus = "active", KycStatus = "verified", PasswordHash = "hash" };
        await dbContext.Users.AddRangeAsync(student, employer);

        var job = new Job
        {
            Id = jobId,
            EmployerId = employerId,
            Title = "Xây dựng website",
            Description = "Mô tả công việc",
            Status = "in_progress",
            HiredApplicantId = studentId,
            Budget = 1000000m,
            EscrowAmount = 1000000m
        };

        var application = new JobApplication
        {
            Id = 501,
            JobId = jobId,
            StudentId = studentId,
            Status = "hired",
            CoverLetter = "Tôi muốn làm việc này",
            AppliedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var otherApp = new JobApplication
        {
            Id = 502,
            JobId = jobId,
            StudentId = 8,
            Status = "rejected",
            CoverLetter = "Đơn khác",
            AppliedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await dbContext.Jobs.AddAsync(job);
        await dbContext.Applications.AddRangeAsync(application, otherApp);
        await dbContext.SaveChangesAsync();

        var service = new ApplicationService(
            appRepoMock.Object,
            jobRepoMock.Object,
            cvRepoMock.Object,
            dbContext,
            storageMock.Object,
            escrowMock.Object,
            reliabilityMock.Object,
            notifMock.Object,
            loggerMock.Object);

        // Act
        await service.CancelOrWithdrawApplicationAsync(studentId, jobId, "Bận việc đột xuất");

        // Assert
        // 1. Phạt điểm sinh viên
        reliabilityMock.Verify(r => r.PenalizeScoreAsync(studentId, 10, It.Is<string>(s => s.Contains("Bận việc đột xuất")), It.IsAny<CancellationToken>()), Times.Once);

        // 2. Hoàn tiền ký quỹ cho NTD
        escrowMock.Verify(e => e.RefundEscrowAsync(employerId, jobId, job.Title, 1000000m, It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);

        // 3. Job được mở lại
        var updatedJob = await dbContext.Jobs.FindAsync(jobId);
        Assert.NotNull(updatedJob);
        Assert.Equal("open", updatedJob.Status);
        Assert.Null(updatedJob.HiredApplicantId);
        Assert.Null(updatedJob.EscrowAmount);

        // 4. Đơn khác được phục hồi sang pending
        var restoredApp = await dbContext.Applications.FindAsync(502);
        Assert.NotNull(restoredApp);
        Assert.Equal("pending", restoredApp.Status);

        // 5. Đơn hiện tại sang cancelled
        var updatedApp = await dbContext.Applications.FindAsync(501);
        Assert.NotNull(updatedApp);
        Assert.Equal("cancelled", updatedApp.Status);
    }

    [Fact]
    public async Task CancelOrWithdrawApplication_WhenPending_ShouldWithdrawSilentlyWithoutPenaltyOrRefund()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var appRepoMock = new Mock<IApplicationRepository>();
        var jobRepoMock = new Mock<IJobRepository>();
        var cvRepoMock = new Mock<ICvFileRepository>();
        var storageMock = new Mock<IStorageService>();
        var escrowMock = new Mock<IEscrowPaymentService>();
        var reliabilityMock = new Mock<IUserReliabilityService>();
        var notifMock = new Mock<INotificationService>();
        var loggerMock = new Mock<ILogger<ApplicationService>>();

        var studentId = 5;
        var employerId = 10;
        var jobId = 101;

        var student = new User { Id = studentId, RoleId = 1, Email = "student5b@test.com", FullName = "Student 5", AccountStatus = "active", KycStatus = "verified", PasswordHash = "hash" };
        await dbContext.Users.AddAsync(student);

        var job = new Job
        {
            Id = jobId,
            EmployerId = employerId,
            Title = "Viết bài content",
            Description = "Mô tả công việc",
            Status = "open",
            HiredApplicantId = null,
            Budget = 500000m
        };

        var application = new JobApplication
        {
            Id = 601,
            JobId = jobId,
            StudentId = studentId,
            Status = "pending",
            CoverLetter = "Tôi muốn rút đơn",
            AppliedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await dbContext.Jobs.AddAsync(job);
        await dbContext.Applications.AddAsync(application);
        await dbContext.SaveChangesAsync();

        var service = new ApplicationService(
            appRepoMock.Object,
            jobRepoMock.Object,
            cvRepoMock.Object,
            dbContext,
            storageMock.Object,
            escrowMock.Object,
            reliabilityMock.Object,
            notifMock.Object,
            loggerMock.Object);

        // Act
        await service.CancelOrWithdrawApplicationAsync(studentId, jobId, "Rút đơn sớm");

        // Assert
        // Không phạt điểm, không refund
        reliabilityMock.Verify(r => r.PenalizeScoreAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        escrowMock.Verify(e => e.RefundEscrowAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<string>(), It.IsAny<decimal>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);

        // Job giữ nguyên open
        var updatedJob = await dbContext.Jobs.FindAsync(jobId);
        Assert.NotNull(updatedJob);
        Assert.Equal("open", updatedJob.Status);

        // Đơn sang cancelled
        var updatedApp = await dbContext.Applications.FindAsync(601);
        Assert.NotNull(updatedApp);
        Assert.Equal("cancelled", updatedApp.Status);
    }

    [Fact]
    public async Task CancelOrWithdrawApplication_WhenJobCancelledAndApplicantPending_ShouldAllowWithdrawal()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var appRepoMock = new Mock<IApplicationRepository>();
        var jobRepoMock = new Mock<IJobRepository>();
        var cvRepoMock = new Mock<ICvFileRepository>();
        var storageMock = new Mock<IStorageService>();
        var escrowMock = new Mock<IEscrowPaymentService>();
        var reliabilityMock = new Mock<IUserReliabilityService>();
        var notifMock = new Mock<INotificationService>();
        var loggerMock = new Mock<ILogger<ApplicationService>>();

        var studentId = 7;
        var employerId = 12;
        var jobId = 105;

        var student = new User { Id = studentId, RoleId = 1, Email = "student7@test.com", FullName = "Student 7", AccountStatus = "active", KycStatus = "verified", PasswordHash = "hash" };
        await dbContext.Users.AddAsync(student);

        var job = new Job
        {
            Id = jobId,
            EmployerId = employerId,
            Title = "Job đã bị hủy",
            Description = "Mô tả",
            Status = "cancelled",
            HiredApplicantId = null,
            Budget = 300000m
        };

        var application = new JobApplication
        {
            Id = 701,
            JobId = jobId,
            StudentId = studentId,
            Status = "pending",
            CoverLetter = "Đơn chờ duyệt",
            AppliedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await dbContext.Jobs.AddAsync(job);
        await dbContext.Applications.AddAsync(application);
        await dbContext.SaveChangesAsync();

        var service = new ApplicationService(
            appRepoMock.Object,
            jobRepoMock.Object,
            cvRepoMock.Object,
            dbContext,
            storageMock.Object,
            escrowMock.Object,
            reliabilityMock.Object,
            notifMock.Object,
            loggerMock.Object);

        // Act - sinh viên rút đơn pending trên job đã hủy bởi NTD
        await service.CancelOrWithdrawApplicationAsync(studentId, jobId, "Rút đơn khỏi job đã bị hủy");

        // Assert
        var updatedApp = await dbContext.Applications.FindAsync(701);
        Assert.NotNull(updatedApp);
        Assert.Equal("cancelled", updatedApp.Status);

        // Không trừ điểm uy tín hay refund
        reliabilityMock.Verify(r => r.PenalizeScoreAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        escrowMock.Verify(e => e.RefundEscrowAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<string>(), It.IsAny<decimal>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
