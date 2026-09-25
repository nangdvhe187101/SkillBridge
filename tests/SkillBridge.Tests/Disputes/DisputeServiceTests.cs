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
using SkillBridge.Application.DTOs.Disputes;
using SkillBridge.Application.DTOs.Storage;
using SkillBridge.Application.Interfaces.Notifications;
using SkillBridge.Application.Interfaces.Payments;
using SkillBridge.Application.Interfaces.Storage;
using SkillBridge.Application.Interfaces.Users;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Services.Disputes;
using Xunit;

namespace SkillBridge.Tests.Disputes;

public class DisputeServiceTests
{
    private readonly Mock<IStorageService> _storageMock = new();
    private readonly Mock<IEscrowPaymentService> _escrowMock = new();
    private readonly Mock<IUserReliabilityService> _reliabilityMock = new();
    private readonly Mock<INotificationService> _notificationMock = new();
    private readonly Mock<ILogger<DisputeService>> _loggerMock = new();

    private SkillBridgeDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<SkillBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new SkillBridgeDbContext(options);
    }

    [Fact]
    public async Task CreateDisputeAsync_ValidConditions_ShouldCreateDisputeAndSetJobToDisputed()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var employerId = 10;
        var studentId = 20;
        var jobId = 100;
        var budget = 1000000m;

        var job = new Job
        {
            Id = jobId,
            EmployerId = employerId,
            HiredApplicantId = studentId,
            Title = "Thiết kế Website",
            Description = "Mô tả chi tiết dự án",
            Status = "in_progress",
            Budget = budget
        };
        dbContext.Jobs.Add(job);
        dbContext.Users.Add(new User { Id = employerId, FullName = "Công ty ABC", Email = "abc@corp.vn", RoleId = 2, AccountStatus = "active", KycStatus = "verified", PasswordHash = "x" });
        dbContext.Users.Add(new User { Id = studentId, FullName = "Nguyễn Văn Sinh", Email = "sinh@edu.vn", RoleId = 1, AccountStatus = "active", KycStatus = "verified", PasswordHash = "x" });
        await dbContext.SaveChangesAsync();

        var service = new DisputeService(
            dbContext,
            _storageMock.Object,
            _escrowMock.Object,
            _reliabilityMock.Object,
            _notificationMock.Object,
            _loggerMock.Object);

        var request = new CreateDisputeRequest
        {
            JobId = jobId,
            Reason = "Nhà tuyển dụng thay đổi yêu cầu vượt quá thỏa thuận ban đầu",
            Origin = "manual"
        };

        // Act (Student mở khiếu nại)
        var result = await service.CreateDisputeAsync(studentId, request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(jobId, result.JobId);
        Assert.Equal("student", result.FiledBy);
        Assert.Equal("open", result.Status);
        Assert.Equal(budget, result.Amount);

        // Job status đổi sang 'disputed'
        var updatedJob = await dbContext.Jobs.FindAsync(jobId);
        Assert.NotNull(updatedJob);
        Assert.Equal("disputed", updatedJob.Status);

        // Notification được gửi cho đối phương (Employer)
        _notificationMock.Verify(n => n.SendAsync(
            employerId,
            "⚠️",
            It.Is<string>(s => s.Contains("đã gửi yêu cầu khiếu nại")),
            "/mywork",
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateDisputeAsync_WhenJobCompleted_ShouldThrowBusinessException()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var employerId = 10;
        var studentId = 20;
        var jobId = 101;

        var job = new Job
        {
            Id = jobId,
            EmployerId = employerId,
            HiredApplicantId = studentId,
            Title = "Dự án đã xong",
            Description = "Mô tả chi tiết",
            Status = "completed",
            Budget = 500000m
        };
        dbContext.Jobs.Add(job);
        dbContext.Users.Add(new User { Id = employerId, FullName = "Công ty ABC", Email = "abc@corp.vn", RoleId = 2, AccountStatus = "active", KycStatus = "verified", PasswordHash = "x" });
        dbContext.Users.Add(new User { Id = studentId, FullName = "Nguyễn Văn Sinh", Email = "sinh@edu.vn", RoleId = 1, AccountStatus = "active", KycStatus = "verified", PasswordHash = "x" });
        await dbContext.SaveChangesAsync();

        var service = new DisputeService(
            dbContext,
            _storageMock.Object,
            _escrowMock.Object,
            _reliabilityMock.Object,
            _notificationMock.Object,
            _loggerMock.Object);

        var request = new CreateDisputeRequest
        {
            JobId = jobId,
            Reason = "Muốn khiếu nại dự án đã xong"
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() => service.CreateDisputeAsync(studentId, request));
        Assert.Contains("Không thể mở khiếu nại cho công việc ở trạng thái 'completed'", ex.Message);
    }

    [Fact]
    public async Task CreateDisputeAsync_WhenAlreadyOpenDispute_ShouldThrowBusinessException()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var employerId = 10;
        var studentId = 20;
        var jobId = 102;

        var job = new Job
        {
            Id = jobId,
            EmployerId = employerId,
            HiredApplicantId = studentId,
            Title = "Dự án đang làm",
            Description = "Mô tả chi tiết",
            Status = "in_progress",
            Budget = 500000m
        };
        dbContext.Jobs.Add(job);
        dbContext.Users.Add(new User { Id = employerId, FullName = "Công ty ABC", Email = "abc@corp.vn", RoleId = 2, AccountStatus = "active", KycStatus = "verified", PasswordHash = "x" });
        dbContext.Users.Add(new User { Id = studentId, FullName = "Nguyễn Văn Sinh", Email = "sinh@edu.vn", RoleId = 1, AccountStatus = "active", KycStatus = "verified", PasswordHash = "x" });

        var existingDispute = new Dispute
        {
            JobId = jobId,
            StudentId = studentId,
            EmployerId = employerId,
            Amount = 500000m,
            FiledBy = "employer",
            Origin = "manual",
            Reason = "Lý do trước",
            Status = "open",
            FiledAt = DateTime.UtcNow
        };
        dbContext.Disputes.Add(existingDispute);
        await dbContext.SaveChangesAsync();

        var service = new DisputeService(
            dbContext,
            _storageMock.Object,
            _escrowMock.Object,
            _reliabilityMock.Object,
            _notificationMock.Object,
            _loggerMock.Object);

        var request = new CreateDisputeRequest
        {
            JobId = jobId,
            Reason = "Lại khiếu nại tiếp"
        };

        // Act & Assert: Chặn trùng lặp
        var ex = await Assert.ThrowsAsync<BusinessException>(() => service.CreateDisputeAsync(employerId, request));
        Assert.Contains("đang có hồ sơ khiếu nại", ex.Message);
    }

    [Fact]
    public async Task AddEvidenceAsync_WhenAfter72Hours_ShouldThrowBusinessException()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var employerId = 10;
        var studentId = 20;
        var jobId = 200;

        var job = new Job
        {
            Id = jobId,
            EmployerId = employerId,
            HiredApplicantId = studentId,
            Title = "Dự án tranh chấp",
            Description = "Mô tả",
            Status = "disputed",
            Budget = 1000000m
        };
        dbContext.Jobs.Add(job);

        // Hồ sơ được mở cách đây 73 giờ (đã quá hạn 72h)
        var dispute = new Dispute
        {
            JobId = jobId,
            StudentId = studentId,
            EmployerId = employerId,
            Amount = 1000000m,
            FiledBy = "student",
            Origin = "manual",
            Reason = "Tranh chấp cũ",
            Status = "open",
            FiledAt = DateTime.UtcNow.AddHours(-73)
        };
        dbContext.Disputes.Add(dispute);
        await dbContext.SaveChangesAsync();

        var service = new DisputeService(
            dbContext,
            _storageMock.Object,
            _escrowMock.Object,
            _reliabilityMock.Object,
            _notificationMock.Object,
            _loggerMock.Object);

        var content = "dummy evidence content";
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes(content));

        var request = new AddEvidenceRequest
        {
            Stream = stream,
            FileName = "evidence.pdf",
            ContentType = "application/pdf",
            Description = "Chứng cứ muộn"
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() => service.AddEvidenceAsync(studentId, dispute.Id, request));
        Assert.Contains("Đã hết thời hạn 72 giờ", ex.Message);
    }

    [Fact]
    public async Task ResolveDisputeAsync_Split_ShouldDistributeFundsAndDeductCommission()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var adminUserId = 1;
        var employerId = 10;
        var studentId = 20;
        var jobId = 300;
        var budget = 1000000m;

        var job = new Job
        {
            Id = jobId,
            EmployerId = employerId,
            HiredApplicantId = studentId,
            Title = "Viết bài PR",
            Description = "Mô tả chi tiết",
            Status = "disputed",
            Budget = budget
        };
        dbContext.Jobs.Add(job);

        var dispute = new Dispute
        {
            JobId = jobId,
            StudentId = studentId,
            EmployerId = employerId,
            Amount = budget,
            FiledBy = "employer",
            Origin = "manual",
            Reason = "Bài viết chất lượng trung bình",
            Status = "open",
            FiledAt = DateTime.UtcNow.AddHours(-10)
        };
        dbContext.Disputes.Add(dispute);
        dbContext.AdminTeamMembers.Add(new AdminTeamMember
        {
            Id = adminUserId,
            Name = "Trọng tài viên",
            Email = "dispute@skillbridge.vn",
            RoleId = 1,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        });
        await dbContext.SaveChangesAsync();

        var service = new DisputeService(
            dbContext,
            _storageMock.Object,
            _escrowMock.Object,
            _reliabilityMock.Object,
            _notificationMock.Object,
            _loggerMock.Object);

        var resolveRequest = new ResolveDisputeRequest
        {
            Decision = "split",
            StudentSplitPercent = 60m, // 60% cho Sinh viên (600,000đ), 40% cho NTD (400,000đ)
            AdminNote = "Hòa giải thành công: Sinh viên nhận 60% khối lượng đã làm, NTD nhận lại 40% cọc"
        };

        // Act
        var result = await service.ResolveDisputeAsync(adminUserId, dispute.Id, resolveRequest);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("closed", result.Status);
        Assert.Equal("split", result.Decision);
        Assert.Equal(600000m, result.PayoutAmount);

        // 1. ReleaseEscrow gọi cho Sinh viên đúng 600,000đ
        _escrowMock.Verify(e => e.ReleaseEscrowAsync(
            studentId,
            employerId,
            jobId,
            job.Title,
            600000m,
            It.IsAny<CancellationToken>()), Times.Once);

        // 2. RefundEscrow gọi cho NTD đúng 400,000đ
        _escrowMock.Verify(e => e.RefundEscrowAsync(
            employerId,
            jobId,
            job.Title,
            400000m,
            It.IsAny<string>(),
            It.IsAny<CancellationToken>()), Times.Once);

        // 3. Job status thành completed
        var updatedJob = await dbContext.Jobs.FindAsync(jobId);
        Assert.NotNull(updatedJob);
        Assert.Equal("completed", updatedJob.Status);
    }
}
