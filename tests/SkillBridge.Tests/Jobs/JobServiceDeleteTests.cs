using System;
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

public class JobServiceDeleteTests
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
            .Options;

        return new SkillBridgeDbContext(options);
    }

    [Fact]
    public async Task DeleteJobAsync_CompletedJob_ShouldThrowBusinessException()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var employerId = 1;
        var jobId = 100;

        var completedJob = new Job
        {
            Id = jobId,
            EmployerId = employerId,
            Title = "Job Da Hoan Thanh",
            Status = "completed"
        };

        _jobRepoMock.Setup(r => r.GetByIdAsync(jobId)).ReturnsAsync(completedJob);

        var service = new JobService(
            _jobRepoMock.Object,
            _categoryRepoMock.Object,
            dbContext,
            _storageMock.Object,
            _escrowMock.Object,
            _reliabilityMock.Object,
            _notificationMock.Object,
            _loggerMock.Object);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() => service.DeleteJobAsync(employerId, jobId));
        Assert.Contains("Không thể xóa công việc đã hoàn thành hoặc đang thực hiện", ex.Message);
        _jobRepoMock.Verify(r => r.DeleteJobAsync(It.IsAny<Job>()), Times.Never);
    }

    [Fact]
    public async Task DeleteJobAsync_JobWithReceipt_ShouldThrowBusinessException()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var employerId = 1;
        var jobId = 200;

        var job = new Job
        {
            Id = jobId,
            EmployerId = employerId,
            Title = "Job Co Receipt",
            Status = "cancelled" // Status cancelled would normally be allowed
        };

        // Add a receipt tied to this job
        dbContext.Receipts.Add(new Receipt
        {
            Id = 5,
            JobId = jobId,
            EmployerId = employerId,
            StudentId = 2,
            Budget = 500000m,
            Commission = 50000m,
            Total = 500000m,
            CreatedAt = DateTime.UtcNow
        });
        await dbContext.SaveChangesAsync();

        _jobRepoMock.Setup(r => r.GetByIdAsync(jobId)).ReturnsAsync(job);

        var service = new JobService(
            _jobRepoMock.Object,
            _categoryRepoMock.Object,
            dbContext,
            _storageMock.Object,
            _escrowMock.Object,
            _reliabilityMock.Object,
            _notificationMock.Object,
            _loggerMock.Object);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() => service.DeleteJobAsync(employerId, jobId));
        Assert.Contains("có biên nhận tài chính hợp lệ", ex.Message);
        _jobRepoMock.Verify(r => r.DeleteJobAsync(It.IsAny<Job>()), Times.Never);
    }
}
