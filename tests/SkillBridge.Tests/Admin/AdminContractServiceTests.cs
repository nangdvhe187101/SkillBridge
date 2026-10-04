using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Admin;
using SkillBridge.Application.Interfaces.Payments;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Services.Admin;
using Xunit;

namespace SkillBridge.Tests.Admin;

public class AdminContractServiceTests
{
    private readonly Mock<ILogger<AdminContractService>> _loggerMock = new();
    private readonly Mock<IEscrowPaymentService> _escrowServiceMock = new();

    private SkillBridgeDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<SkillBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new SkillBridgeDbContext(options);
    }

    private static User CreateUser(int id, string email, string name, string roleCode = "talent")
    {
        return new User
        {
            Id = id,
            Email = email,
            FullName = name,
            AccountStatus = "active",
            KycStatus = "verified",
            ReliabilityScore = 100,
            PasswordHash = "hashed",
            Role = new Role
            {
                Id = id,
                Code = roleCode,
                Name = roleCode,
                Type = roleCode,
                IsActive = true
            }
        };
    }

    [Fact]
    public async Task GetContractStatsAsync_ShouldCalculateMetricsCorrectly()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new AdminContractService(dbContext, _escrowServiceMock.Object, _loggerMock.Object);

        var employer = CreateUser(1, "emp@test.com", "Employer 1", "employer");
        var student = CreateUser(2, "stu@test.com", "Student 1", "talent");
        var cat = new Category { Id = 1, Name = "IT & Phần mềm", PreviewStrategy = "watermark_image" };
        dbContext.Users.AddRange(employer, student);
        dbContext.Categories.Add(cat);

        // Job 1: In progress, bình thường
        dbContext.Jobs.Add(new Job
        {
            Id = 1,
            Title = "Job 1",
            Description = "Desc 1",
            EmployerId = employer.Id,
            HiredApplicantId = student.Id,
            CategoryId = cat.Id,
            Budget = 1000000m,
            EscrowAmount = 1000000m,
            Status = "in_progress",
            PostedAt = DateTime.UtcNow.AddDays(-3),
            DeadlineAt = DateTime.UtcNow.AddDays(5)
        });

        // Job 2: Submitted, quá hạn 75 giờ
        var job2 = new Job
        {
            Id = 2,
            Title = "Job 2",
            Description = "Desc 2",
            EmployerId = employer.Id,
            HiredApplicantId = student.Id,
            CategoryId = cat.Id,
            Budget = 2000000m,
            EscrowAmount = 2000000m,
            Status = "submitted",
            PostedAt = DateTime.UtcNow.AddDays(-5),
            AutoReleaseAt = DateTime.UtcNow.AddHours(-3) // Quá 3 tiếng
        };
        dbContext.Jobs.Add(job2);

        // Job 3: Quá hạn Deadline 10 ngày
        dbContext.Jobs.Add(new Job
        {
            Id = 3,
            Title = "Job 3",
            Description = "Desc 3",
            EmployerId = employer.Id,
            HiredApplicantId = student.Id,
            CategoryId = cat.Id,
            Budget = 3000000m,
            EscrowAmount = 3000000m,
            Status = "in_progress",
            PostedAt = DateTime.UtcNow.AddDays(-20),
            DeadlineAt = DateTime.UtcNow.AddDays(-10) // Quá hạn 10 ngày
        });

        await dbContext.SaveChangesAsync();

        // Act
        var stats = await service.GetContractStatsAsync();

        // Assert
        Assert.Equal(3, stats.TotalActiveContracts);
        Assert.Equal(6000000m, stats.TotalEscrowLocked);
        Assert.Equal(1, stats.SlaBreachedReviewCount);
        Assert.Equal(1, stats.SlaBreachedDeadlineCount);
    }

    [Fact]
    public async Task ForceReleaseAsync_Below5M_ShouldReleaseEscrowAndDeductEmployerReliability()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new AdminContractService(dbContext, _escrowServiceMock.Object, _loggerMock.Object);

        var employer = CreateUser(10, "emp10@test.com", "Employer Ten", "employer");
        var student = CreateUser(20, "stu20@test.com", "Student Twenty", "talent");
        var cat = new Category { Id = 1, Name = "Thiết kế đồ họa", PreviewStrategy = "watermark_image" };
        dbContext.Users.AddRange(employer, student);
        dbContext.Categories.Add(cat);

        var job = new Job
        {
            Id = 100,
            Title = "Thiết kế Banner",
            Description = "Banner quảng cáo",
            EmployerId = employer.Id,
            HiredApplicantId = student.Id,
            CategoryId = cat.Id,
            Budget = 2000000m,
            EscrowAmount = 2000000m,
            Status = "submitted",
            PostedAt = DateTime.UtcNow.AddDays(-4),
            AutoReleaseAt = DateTime.UtcNow.AddHours(-5)
        };
        job.JobDeliverables.Add(new JobDeliverable
        {
            Id = 1,
            JobId = 100,
            StudentId = student.Id,
            Version = 1,
            FinalFileUrl = "https://cdn.skillbridge.vn/banner.png",
            FileName = "banner.png",
            FileType = "image/png",
            Status = "pending",
            SubmittedAt = DateTime.UtcNow.AddHours(-75)
        });
        dbContext.Jobs.Add(job);
        await dbContext.SaveChangesAsync();

        var request = new ForceContractActionRequestDto
        {
            Reason = "NTD không nghiệm thu quá 72 giờ theo quy chế sàn.",
            ConfirmPhrase = "XAC NHAN"
        };

        // Act
        var result = await service.ForceReleaseAsync(100, 999, request);

        // Assert
        Assert.True(result);
        var updatedJob = await dbContext.Jobs.FindAsync(100);
        Assert.Equal("completed", updatedJob?.Status);

        var updatedEmployer = await dbContext.Users.FindAsync(10);
        Assert.Equal(90, updatedEmployer?.ReliabilityScore); // Bị trừ 10 điểm (100 -> 90)

        // Kiểm tra đã gọi ReleaseEscrowAsync
        _escrowServiceMock.Verify(s => s.ReleaseEscrowAsync(
            student.Id, employer.Id, 100, "Thiết kế Banner", 2000000m, It.IsAny<CancellationToken>()), Times.Once);

        // Kiểm tra AuditLog
        var audit = await dbContext.AuditLogs.FirstOrDefaultAsync(a => a.ActionText.Contains("[FORCE_RELEASE_ESCROW]"));
        Assert.NotNull(audit);
        Assert.Equal(999, audit.ActorId);
    }

    [Fact]
    public async Task ForceReleaseAsync_WithoutDeliverable_ShouldThrowException()
    {
        // Arrange (Bất biến INV-CEM-01: Cấm giải ngân khi không có deliverable)
        using var dbContext = CreateInMemoryDbContext();
        var service = new AdminContractService(dbContext, _escrowServiceMock.Object, _loggerMock.Object);

        var employer = CreateUser(1, "emp@test.com", "Employer 1");
        var student = CreateUser(2, "stu@test.com", "Student 1");
        var cat = new Category { Id = 1, Name = "Writing", PreviewStrategy = "watermark_image" };
        dbContext.Users.AddRange(employer, student);
        dbContext.Categories.Add(cat);

        var job = new Job
        {
            Id = 101,
            Title = "Viết bài SEO",
            Description = "Desc",
            EmployerId = employer.Id,
            HiredApplicantId = student.Id,
            CategoryId = cat.Id,
            Budget = 1000000m,
            Status = "submitted"
            // Không có Deliverable nào
        };
        dbContext.Jobs.Add(job);
        await dbContext.SaveChangesAsync();

        var request = new ForceContractActionRequestDto
        {
            Reason = "NTD quá hạn nghiệm thu",
            ConfirmPhrase = "XAC NHAN"
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() => service.ForceReleaseAsync(101, 999, request));
        Assert.Contains("INV-CEM-01", ex.Message);
    }

    [Fact]
    public async Task ForceReleaseAsync_Above5M_ShouldTriggerMakerChecker()
    {
        // Arrange (Bất biến INV-CEM-02: > 5 triệu chuyển Maker-Checker)
        using var dbContext = CreateInMemoryDbContext();
        var service = new AdminContractService(dbContext, _escrowServiceMock.Object, _loggerMock.Object);

        var employer = CreateUser(1, "emp@test.com", "Employer 1");
        var student = CreateUser(2, "stu@test.com", "Student 1");
        var cat = new Category { Id = 1, Name = "Mobile App", PreviewStrategy = "watermark_image" };
        dbContext.Users.AddRange(employer, student);
        dbContext.Categories.Add(cat);

        var job = new Job
        {
            Id = 102,
            Title = "Xây dựng App Flutter",
            Description = "Desc",
            EmployerId = employer.Id,
            HiredApplicantId = student.Id,
            CategoryId = cat.Id,
            Budget = 15000000m, // 15 triệu (> 5M)
            EscrowAmount = 15000000m,
            Status = "submitted"
        };
        job.JobDeliverables.Add(new JobDeliverable
        {
            Id = 2,
            JobId = 102,
            StudentId = student.Id,
            Version = 1,
            FileName = "app-release.apk",
            FileType = "application/vnd.android.package-archive",
            Status = "pending",
            SubmittedAt = DateTime.UtcNow.AddHours(-80)
        });
        dbContext.Jobs.Add(job);
        await dbContext.SaveChangesAsync();

        var request = new ForceContractActionRequestDto
        {
            Reason = "Đã quá 72 giờ không phản hồi kiểm thử.",
            ConfirmPhrase = "XAC NHAN"
        };

        // Act
        var result = await service.ForceReleaseAsync(102, 101, request); // Maker ID 101

        // Assert
        Assert.True(result);
        // Chưa được giải ngân ngay (Escrow service không được gọi)
        _escrowServiceMock.Verify(s => s.ReleaseEscrowAsync(
            It.IsAny<int>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<string>(), It.IsAny<decimal>(), It.IsAny<CancellationToken>()), Times.Never);

        // Bản ghi đề xuất Maker được lưu trong AuditLog
        var proposal = await dbContext.AuditLogs.FirstOrDefaultAsync(a => a.ActionText.Contains("[PROPOSE_FORCE_RELEASE_ESCROW]"));
        Assert.NotNull(proposal);
        Assert.Equal(101, proposal.ActorId);
    }

    [Fact]
    public async Task ApproveCheckerAsync_WhenSameMakerAndChecker_ShouldThrowSelfApprovalException()
    {
        // Arrange (Bất biến INV-CEM-02: Cấm Checker trùng Maker)
        using var dbContext = CreateInMemoryDbContext();
        var service = new AdminContractService(dbContext, _escrowServiceMock.Object, _loggerMock.Object);

        // Đã có đề xuất của Maker ID 555
        dbContext.AuditLogs.Add(new AuditLog
        {
            Id = 1,
            ActorId = 555,
            ActionText = "[PROPOSE_FORCE_RELEASE_ESCROW] Maker ID 555 đề xuất cưỡng chế giải ngân 15.000.000đ cho Job #103.",
            CreatedAt = DateTime.UtcNow
        });
        await dbContext.SaveChangesAsync();

        // Act & Assert (Checker ID 555 cố tình tự duyệt lệnh của mình)
        var ex = await Assert.ThrowsAsync<BusinessException>(() => service.ApproveCheckerAsync(103, 555));
        Assert.Contains("Maker = Checker", ex.Message);
    }

    [Fact]
    public async Task ForceRefundAsync_Below5M_ShouldRefundEscrowAndDeductStudentReliability()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new AdminContractService(dbContext, _escrowServiceMock.Object, _loggerMock.Object);

        var employer = CreateUser(30, "emp30@test.com", "Employer Thirty", "employer");
        var student = CreateUser(40, "stu40@test.com", "Student Forty", "talent");
        var cat = new Category { Id = 1, Name = "Dịch thuật", PreviewStrategy = "watermark_image" };
        dbContext.Users.AddRange(employer, student);
        dbContext.Categories.Add(cat);

        var job = new Job
        {
            Id = 104,
            Title = "Dịch tài liệu tiếng Anh",
            Description = "Desc",
            EmployerId = employer.Id,
            HiredApplicantId = student.Id,
            CategoryId = cat.Id,
            Budget = 1500000m,
            EscrowAmount = 1500000m,
            Status = "in_progress",
            PostedAt = DateTime.UtcNow.AddDays(-20),
            DeadlineAt = DateTime.UtcNow.AddDays(-8) // Quá hạn 8 ngày (> 7 ngày)
        };
        dbContext.Jobs.Add(job);
        await dbContext.SaveChangesAsync();

        var request = new ForceContractActionRequestDto
        {
            Reason = "Sinh viên quá hạn 8 ngày không liên lạc và không nộp bài.",
            ConfirmPhrase = "XAC NHAN"
        };

        // Act
        var result = await service.ForceRefundAsync(104, 888, request);

        // Assert
        Assert.True(result);
        var updatedJob = await dbContext.Jobs.FindAsync(104);
        Assert.Equal("cancelled", updatedJob?.Status);

        var updatedStudent = await dbContext.Users.FindAsync(40);
        Assert.Equal(85, updatedStudent?.ReliabilityScore); // Bị trừ 15 điểm (100 -> 85)

        _escrowServiceMock.Verify(s => s.RefundEscrowAsync(
            employer.Id, 104, "Dịch tài liệu tiếng Anh", 1500000m, It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }
}
