using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using SkillBridge.Application.Common;
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

public class JobServiceCancelTests
{
    private readonly Mock<IJobRepository> _jobRepoMock = new();
    private readonly Mock<ICategoryRepository> _categoryRepoMock = new();
    private readonly Mock<IStorageService> _storageMock = new();
    private readonly Mock<IEscrowPaymentService> _escrowMock = new();
    private readonly Mock<IUserReliabilityService> _reliabilityMock = new();
    private readonly Mock<INotificationService> _notificationMock = new();
    private readonly Mock<ILogger<JobService>> _loggerMock = new();

    private SkillBridgeDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<SkillBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new SkillBridgeDbContext(options);
    }

    [Fact]
    public async Task CancelJobAsync_WhenJobNotFound_ShouldThrowBusinessException()
    {
        using var dbContext = CreateInMemoryDbContext();
        _jobRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Job?)null);

        var service = new JobService(
            _jobRepoMock.Object,
            _categoryRepoMock.Object,
            dbContext,
            _storageMock.Object,
            _escrowMock.Object,
            _reliabilityMock.Object,
            _notificationMock.Object,
            _loggerMock.Object);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => service.CancelJobAsync(1, 999));
        Assert.Contains("Không tìm thấy công việc", ex.Message);
    }

    [Fact]
    public async Task CancelJobAsync_WhenNotEmployer_ShouldThrowBusinessException()
    {
        using var dbContext = CreateInMemoryDbContext();
        var job = new Job { Id = 1, EmployerId = 2, Status = "open" };
        _jobRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(job);

        var service = new JobService(
            _jobRepoMock.Object,
            _categoryRepoMock.Object,
            dbContext,
            _storageMock.Object,
            _escrowMock.Object,
            _reliabilityMock.Object,
            _notificationMock.Object,
            _loggerMock.Object);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => service.CancelJobAsync(1, 1));
        Assert.Contains("Bạn không có quyền hủy công việc này", ex.Message);
    }

    [Fact]
    public async Task CancelJobAsync_WhenAlreadyCancelled_ShouldThrowBusinessException()
    {
        using var dbContext = CreateInMemoryDbContext();
        var job = new Job { Id = 1, EmployerId = 1, Status = "cancelled" };
        _jobRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(job);

        var service = new JobService(
            _jobRepoMock.Object,
            _categoryRepoMock.Object,
            dbContext,
            _storageMock.Object,
            _escrowMock.Object,
            _reliabilityMock.Object,
            _notificationMock.Object,
            _loggerMock.Object);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => service.CancelJobAsync(1, 1));
        Assert.Contains("Công việc này đã bị hủy trước đó", ex.Message);
    }

    [Fact]
    public async Task CancelJobAsync_WhenHired_ShouldPenalizeEmployerRefundEscrowAndCleanUpFilesPostCommit()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var employerId = 10;
        var studentId = 20;
        var jobId = 100;
        var budget = 500000m;

        var job = new Job
        {
            Id = jobId,
            EmployerId = employerId,
            Title = "Thiết kế Banner",
            Status = "in_progress",
            Budget = budget,
            HiredApplicantId = studentId
        };
        _jobRepoMock.Setup(r => r.GetByIdAsync(jobId)).ReturnsAsync(job);

        var app = new JobApplication
        {
            Id = 1,
            JobId = jobId,
            StudentId = studentId,
            Status = "hired"
        };
        dbContext.Applications.Add(app);

        var del = new JobDeliverable
        {
            Id = 1,
            JobId = jobId,
            StudentId = studentId,
            Version = 1,
            FileName = "banner.png",
            Status = "submitted",
            FileType = "image",
            PreviewFileUrl = "https://r2.skillbridge.vn/deliverables/watermark-1.jpg",
            FinalFileUrl = "https://r2.skillbridge.vn/deliverables/final-1.jpg"
        };
        dbContext.JobDeliverables.Add(del);
        await dbContext.SaveChangesAsync();

        var service = new JobService(
            _jobRepoMock.Object,
            _categoryRepoMock.Object,
            dbContext,
            _storageMock.Object,
            _escrowMock.Object,
            _reliabilityMock.Object,
            _notificationMock.Object,
            _loggerMock.Object);

        // Act
        await service.CancelJobAsync(employerId, jobId);

        // Assert
        // 1. Penalized reliability
        _reliabilityMock.Verify(r => r.PenalizeScoreAsync(employerId, 10, It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);

        // 2. Refund escrow called with exact job budget
        _escrowMock.Verify(e => e.RefundEscrowAsync(employerId, jobId, job.Title, budget, It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);

        // 3. Application cancelled
        var updatedApp = await dbContext.Applications.FindAsync(1);
        Assert.NotNull(updatedApp);
        Assert.Equal("cancelled", updatedApp.Status);

        // 4. Deliverables cancelled and URLs cleared in DB
        var updatedDel = await dbContext.JobDeliverables.FindAsync(1);
        Assert.NotNull(updatedDel);
        Assert.Equal("cancelled", updatedDel.Status);
        Assert.Null(updatedDel.PreviewFileUrl);
        Assert.Null(updatedDel.FinalFileUrl);

        // 5. Notification sent to student
        _notificationMock.Verify(n => n.SendAsync(studentId, "⚠️", It.Is<string>(s => s.Contains("đã hủy công việc")), "/mywork", It.IsAny<CancellationToken>()), Times.Once);

        // 6. R2 storage delete called for deliverables
        _storageMock.Verify(s => s.DeleteFileAsync("deliverables/watermark-1.jpg", It.IsAny<CancellationToken>()), Times.Once);
        _storageMock.Verify(s => s.DeleteFileAsync("deliverables/final-1.jpg", It.IsAny<CancellationToken>()), Times.Once);

        // 7. Job repo CancelJobAsync called
        _jobRepoMock.Verify(r => r.CancelJobAsync(job), Times.Once);
    }
}
