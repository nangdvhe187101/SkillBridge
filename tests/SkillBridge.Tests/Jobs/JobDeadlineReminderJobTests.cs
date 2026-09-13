using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using SkillBridge.Application.DTOs.Jobs;
using SkillBridge.Application.Interfaces;
using SkillBridge.Application.Interfaces.Notifications;
using SkillBridge.Application.Interfaces.Payments;
using SkillBridge.Application.Interfaces.Storage;
using SkillBridge.Application.Interfaces.Users;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Repositories.Interfaces;
using SkillBridge.Infrastructure.Services.Jobs;
using Xunit;

namespace SkillBridge.Tests.Jobs;

public class JobDeadlineReminderJobTests
{
    private readonly Mock<INotificationService> _notificationMock = new();
    private readonly Mock<IEmailService> _emailMock = new();
    private readonly Mock<ILogger<JobDeadlineReminderJob>> _loggerMock = new();

    private SkillBridgeDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<SkillBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new SkillBridgeDbContext(options);
    }

    private User CreateTestUser(int id, string fullName, string email, int roleId)
    {
        return new User
        {
            Id = id,
            FullName = fullName,
            Email = email,
            RoleId = roleId,
            AccountStatus = "active",
            KycStatus = "verified",
            PasswordHash = "hashed_pw"
        };
    }

    private IServiceScopeFactory CreateMockScopeFactory(
        SkillBridgeDbContext db,
        INotificationService notificationService,
        IEmailService emailService)
    {
        var serviceProviderMock = new Mock<IServiceProvider>();
        serviceProviderMock.Setup(sp => sp.GetService(typeof(SkillBridgeDbContext))).Returns(db);
        serviceProviderMock.Setup(sp => sp.GetService(typeof(INotificationService))).Returns(notificationService);
        serviceProviderMock.Setup(sp => sp.GetService(typeof(IEmailService))).Returns(emailService);

        var scopeMock = new Mock<IServiceScope>();
        scopeMock.Setup(s => s.ServiceProvider).Returns(serviceProviderMock.Object);

        var scopeFactoryMock = new Mock<IServiceScopeFactory>();
        scopeFactoryMock.Setup(sf => sf.CreateScope()).Returns(scopeMock.Object);

        return scopeFactoryMock.Object;
    }

    [Fact]
    public async Task ProcessDeadlineRemindersAsync_WarningDueSoon_ShouldSendWarningToStudentAndSetSentAt()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();

        var employer = CreateTestUser(1, "Employer One", "employer@test.com", 2);
        var student = CreateTestUser(2, "Student One", "student@test.com", 3);
        db.Users.AddRange(employer, student);

        var job = new Job
        {
            Id = 101,
            EmployerId = employer.Id,
            Employer = employer,
            HiredApplicantId = student.Id,
            HiredApplicant = student,
            Title = "Job Sắp Hết Hạn",
            Description = "Mô tả",
            Status = "in_progress",
            DeadlineAt = DateTime.UtcNow.AddHours(6), // Còn 6h (< 12h)
            DeadlineWarningSentAt = null,
            DeadlineOverdueSentAt = null,
            PostedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.Jobs.Add(job);
        await db.SaveChangesAsync();

        var scopeFactory = CreateMockScopeFactory(db, _notificationMock.Object, _emailMock.Object);
        var jobService = new JobDeadlineReminderJob(scopeFactory, _loggerMock.Object);

        // Act
        await jobService.ProcessDeadlineRemindersAsync(CancellationToken.None);

        // Assert
        // Đã gửi thông báo cho sinh viên
        _notificationMock.Verify(n => n.SendAsync(
            student.Id,
            "⏰",
            It.Is<string>(msg => msg.Contains("Job Sắp Hết Hạn")),
            "/mywork",
            It.IsAny<CancellationToken>()), Times.Once);

        // Đã gửi email cho sinh viên
        _emailMock.Verify(e => e.SendDeadlineWarningEmailAsync(
            student.Email,
            student.FullName,
            job.Title,
            job.DeadlineAt.Value), Times.Once);

        // Không gửi cho employer mức warning
        _notificationMock.Verify(n => n.SendAsync(employer.Id, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);

        // DB đã cập nhật DeadlineWarningSentAt
        var updatedJob = await db.Jobs.FindAsync(job.Id);
        Assert.NotNull(updatedJob!.DeadlineWarningSentAt);
        Assert.Null(updatedJob.DeadlineOverdueSentAt);
    }

    [Fact]
    public async Task ProcessDeadlineRemindersAsync_WarningAlreadySent_ShouldNotSendAgain()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();

        var employer = CreateTestUser(1, "Employer One", "employer@test.com", 2);
        var student = CreateTestUser(2, "Student One", "student@test.com", 3);
        db.Users.AddRange(employer, student);

        var job = new Job
        {
            Id = 102,
            EmployerId = employer.Id,
            Employer = employer,
            HiredApplicantId = student.Id,
            HiredApplicant = student,
            Title = "Job Đã Báo Warning Trước Đó",
            Description = "Mô tả",
            Status = "in_progress",
            DeadlineAt = DateTime.UtcNow.AddHours(4),
            DeadlineWarningSentAt = DateTime.UtcNow.AddHours(-1), // Đã gửi warning 1 giờ trước
            DeadlineOverdueSentAt = null,
            PostedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.Jobs.Add(job);
        await db.SaveChangesAsync();

        var scopeFactory = CreateMockScopeFactory(db, _notificationMock.Object, _emailMock.Object);
        var jobService = new JobDeadlineReminderJob(scopeFactory, _loggerMock.Object);

        // Act
        await jobService.ProcessDeadlineRemindersAsync(CancellationToken.None);

        // Assert: Không gửi lại bất kỳ thông báo hay email nào
        _notificationMock.Verify(n => n.SendAsync(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        _emailMock.Verify(e => e.SendDeadlineWarningEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTime>()), Times.Never);
    }

    [Fact]
    public async Task ProcessDeadlineRemindersAsync_OverdueJob_ShouldSendToBothStudentAndEmployerAndSetOverdueSentAt()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();

        var employer = CreateTestUser(1, "Employer One", "employer@test.com", 2);
        var student = CreateTestUser(2, "Student One", "student@test.com", 3);
        db.Users.AddRange(employer, student);

        var job = new Job
        {
            Id = 103,
            EmployerId = employer.Id,
            Employer = employer,
            HiredApplicantId = student.Id,
            HiredApplicant = student,
            Title = "Job Đã Quá Hạn",
            Description = "Mô tả",
            Status = "in_progress",
            DeadlineAt = DateTime.UtcNow.AddHours(-2), // Quá hạn 2 giờ
            DeadlineWarningSentAt = DateTime.UtcNow.AddHours(-10), // Đã từng warning
            DeadlineOverdueSentAt = null,
            PostedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.Jobs.Add(job);
        await db.SaveChangesAsync();

        var scopeFactory = CreateMockScopeFactory(db, _notificationMock.Object, _emailMock.Object);
        var jobService = new JobDeadlineReminderJob(scopeFactory, _loggerMock.Object);

        // Act
        await jobService.ProcessDeadlineRemindersAsync(CancellationToken.None);

        // Assert: Cả sinh viên và nhà tuyển dụng đều nhận thông báo & email overdue
        _notificationMock.Verify(n => n.SendAsync(
            student.Id,
            "⚠️",
            It.Is<string>(msg => msg.Contains("Job Đã Quá Hạn")),
            "/mywork",
            It.IsAny<CancellationToken>()), Times.Once);

        _notificationMock.Verify(n => n.SendAsync(
            employer.Id,
            "⚠️",
            It.Is<string>(msg => msg.Contains("Job Đã Quá Hạn")),
            $"/jobs/{job.Id}",
            It.IsAny<CancellationToken>()), Times.Once);

        _emailMock.Verify(e => e.SendDeadlineOverdueEmailAsync(
            student.Email,
            student.FullName,
            job.Title,
            job.DeadlineAt.Value), Times.Once);

        _emailMock.Verify(e => e.SendDeadlineOverdueEmailAsync(
            employer.Email,
            employer.FullName,
            job.Title,
            job.DeadlineAt.Value), Times.Once);

        // DB cập nhật DeadlineOverdueSentAt
        var updatedJob = await db.Jobs.FindAsync(job.Id);
        Assert.NotNull(updatedJob!.DeadlineOverdueSentAt);
    }

    [Fact]
    public async Task ProcessDeadlineRemindersAsync_CompletedOrCancelledJob_ShouldNotSendAnyReminders()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();

        var employer = CreateTestUser(1, "Employer One", "employer@test.com", 2);
        var student = CreateTestUser(2, "Student One", "student@test.com", 3);
        db.Users.AddRange(employer, student);

        var completedJob = new Job
        {
            Id = 104,
            EmployerId = employer.Id,
            Employer = employer,
            HiredApplicantId = student.Id,
            HiredApplicant = student,
            Title = "Job Hoàn Thành",
            Description = "Mô tả",
            Status = "completed",
            DeadlineAt = DateTime.UtcNow.AddHours(-1),
            PostedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var cancelledJob = new Job
        {
            Id = 105,
            EmployerId = employer.Id,
            Employer = employer,
            HiredApplicantId = student.Id,
            HiredApplicant = student,
            Title = "Job Đã Hủy",
            Description = "Mô tả",
            Status = "cancelled",
            DeadlineAt = DateTime.UtcNow.AddHours(-1),
            PostedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.Jobs.AddRange(completedJob, cancelledJob);
        await db.SaveChangesAsync();

        var scopeFactory = CreateMockScopeFactory(db, _notificationMock.Object, _emailMock.Object);
        var jobService = new JobDeadlineReminderJob(scopeFactory, _loggerMock.Object);

        // Act
        await jobService.ProcessDeadlineRemindersAsync(CancellationToken.None);

        // Assert: Không gửi gì cho job completed hoặc cancelled
        _notificationMock.Verify(n => n.SendAsync(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        _emailMock.Verify(e => e.SendDeadlineWarningEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTime>()), Times.Never);
        _emailMock.Verify(e => e.SendDeadlineOverdueEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTime>()), Times.Never);
    }

    [Fact]
    public async Task ProcessDeadlineRemindersAsync_WhenEmailThrows_ShouldCatchAndContinueSavingJob()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();

        var employer = CreateTestUser(1, "Employer One", "employer@test.com", 2);
        var student = CreateTestUser(2, "Student One", "student@test.com", 3);
        db.Users.AddRange(employer, student);

        var job = new Job
        {
            Id = 106,
            EmployerId = employer.Id,
            Employer = employer,
            HiredApplicantId = student.Id,
            HiredApplicant = student,
            Title = "Job Lỗi Email",
            Description = "Mô tả",
            Status = "in_progress",
            DeadlineAt = DateTime.UtcNow.AddHours(5),
            PostedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.Jobs.Add(job);
        await db.SaveChangesAsync();

        var emailMockFailing = new Mock<IEmailService>();
        emailMockFailing.Setup(e => e.SendDeadlineWarningEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTime>()))
            .ThrowsAsync(new InvalidOperationException("SMTP connection failed"));

        var scopeFactory = CreateMockScopeFactory(db, _notificationMock.Object, emailMockFailing.Object);
        var jobService = new JobDeadlineReminderJob(scopeFactory, _loggerMock.Object);

        // Act & Assert (Không throw ra ngoài)
        var exception = await Record.ExceptionAsync(() => jobService.ProcessDeadlineRemindersAsync(CancellationToken.None));
        Assert.Null(exception);

        // DB vẫn được lưu trạng thái deadline_warning_sent_at
        var updatedJob = await db.Jobs.FindAsync(job.Id);
        Assert.NotNull(updatedJob!.DeadlineWarningSentAt);
    }

    [Fact]
    public async Task JobService_ExtendDeadlineAsync_ShouldResetDeadlineReminderFlags()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var employerId = 1;
        var jobId = 200;

        var job = new Job
        {
            Id = jobId,
            EmployerId = employerId,
            Title = "Job Gia Hạn",
            Description = "Mô tả",
            Status = "in_progress",
            HiredApplicantId = 2,
            DeadlineAt = DateTime.UtcNow.AddHours(2),
            DeadlineWarningSentAt = DateTime.UtcNow.AddHours(-1),
            DeadlineOverdueSentAt = DateTime.UtcNow.AddHours(-2),
            PostedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var jobRepoMock = new Mock<IJobRepository>();
        jobRepoMock.Setup(r => r.GetByIdAsync(jobId)).ReturnsAsync(job);
        jobRepoMock.Setup(r => r.UpdateJobAsync(It.IsAny<Job>())).Returns(Task.CompletedTask);

        var service = new JobService(
            jobRepoMock.Object,
            Mock.Of<ICategoryRepository>(),
            db,
            Mock.Of<IStorageService>(),
            Mock.Of<IEscrowPaymentService>(),
            Mock.Of<IUserReliabilityService>(),
            _notificationMock.Object,
            Mock.Of<ILogger<JobService>>());

        var newDeadline = DateTime.UtcNow.AddDays(3);
        var request = new ExtendDeadlineRequest { NewDeadlineAt = newDeadline };

        // Act
        await service.ExtendDeadlineAsync(employerId, jobId, request);

        // Assert
        Assert.Equal(newDeadline, job.DeadlineAt);
        Assert.Null(job.DeadlineWarningSentAt);
        Assert.Null(job.DeadlineOverdueSentAt);
        jobRepoMock.Verify(r => r.UpdateJobAsync(job), Times.Once);
    }

    [Fact]
    public async Task ProcessDeadlineRemindersAsync_AfterDeadlineExtended_ShouldAllowNewWarningWhenDue()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();

        var employer = CreateTestUser(1, "Employer One", "employer@test.com", 2);
        var student = CreateTestUser(2, "Student One", "student@test.com", 3);
        db.Users.AddRange(employer, student);

        // Job đã từng gửi warning cho hạn cũ, nhưng được gia hạn sang hạn mới (còn 8 tiếng nữa) và cờ được reset về null
        var job = new Job
        {
            Id = 107,
            EmployerId = employer.Id,
            Employer = employer,
            HiredApplicantId = student.Id,
            HiredApplicant = student,
            Title = "Job Sau Gia Hạn",
            Description = "Mô tả",
            Status = "in_progress",
            DeadlineAt = DateTime.UtcNow.AddHours(8), // Hạn mới còn 8 tiếng
            DeadlineWarningSentAt = null, // Cờ đã được reset khi gia hạn
            DeadlineOverdueSentAt = null,
            PostedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.Jobs.Add(job);
        await db.SaveChangesAsync();

        var scopeFactory = CreateMockScopeFactory(db, _notificationMock.Object, _emailMock.Object);
        var jobService = new JobDeadlineReminderJob(scopeFactory, _loggerMock.Object);

        // Act
        await jobService.ProcessDeadlineRemindersAsync(CancellationToken.None);

        // Assert: Nhắc nhở warning được kích hoạt cho hạn mới
        _notificationMock.Verify(n => n.SendAsync(
            student.Id,
            "⏰",
            It.Is<string>(msg => msg.Contains("Job Sau Gia Hạn")),
            "/mywork",
            It.IsAny<CancellationToken>()), Times.Once);

        _emailMock.Verify(e => e.SendDeadlineWarningEmailAsync(
            student.Email,
            student.FullName,
            job.Title,
            job.DeadlineAt.Value), Times.Once);

        var updatedJob = await db.Jobs.FindAsync(job.Id);
        Assert.NotNull(updatedJob!.DeadlineWarningSentAt);
    }
}
