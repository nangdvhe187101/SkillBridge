using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Moq;
using SkillBridge.Application.Interfaces.Storage;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Repositories.Implementations;
using Xunit;

namespace SkillBridge.Tests.Jobs;

/// <summary>
/// Xác nhận JobSummaryDto.HasOpenDispute phản ánh đúng bảng Disputes (status='open'),
/// không phụ thuộc vào Job.Status - vì job.Status chỉ chuyển sang 'disputed' nếu DB enum
/// đã được ALTER TABLE hỗ trợ giá trị đó (xem DbInitializer), và trước đó frontend từng
/// so sánh sai với các giá trị dispute.status không tồn tại ('pending', 'in_arbitration').
/// </summary>
public class JobRepositoryDisputeTests
{
    private readonly Mock<IStorageService> _storageMock = new();

    private static SkillBridgeDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<SkillBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new SkillBridgeDbContext(options);
    }

    [Fact]
    public async Task GetEmployerJobsPagedAsync_WhenJobHasOpenDispute_ShouldSetHasOpenDisputeTrue()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var category = new Category { Id = 1, Name = "Thiết kế đồ hoạ", DefaultRevisionLimit = 2, PreviewStrategy = "watermark_image" };
        var employer = new User
        {
            Id = 20,
            Email = "employer@skillbridge.vn",
            FullName = "Employer Test",
            RoleId = 3,
            AccountStatus = "active",
            KycStatus = "verified",
            PasswordHash = "hash"
        };
        var student = new User
        {
            Id = 10,
            Email = "student@skillbridge.vn",
            FullName = "Student Test",
            RoleId = 2,
            AccountStatus = "active",
            KycStatus = "verified",
            PasswordHash = "hash"
        };

        var jobWithOpenDispute = new Job
        {
            Id = 100,
            EmployerId = employer.Id,
            CategoryId = category.Id,
            Title = "Job có khiếu nại đang mở",
            Description = "Mô tả công việc",
            Status = "in_progress",
            Budget = 500000,
            HiredApplicantId = student.Id,
            PostedAt = DateTime.UtcNow.AddDays(-5),
            UpdatedAt = DateTime.UtcNow.AddDays(-5)
        };

        var jobWithClosedDispute = new Job
        {
            Id = 101,
            EmployerId = employer.Id,
            CategoryId = category.Id,
            Title = "Job có khiếu nại đã đóng",
            Description = "Mô tả công việc",
            Status = "completed",
            Budget = 400000,
            HiredApplicantId = student.Id,
            PostedAt = DateTime.UtcNow.AddDays(-10),
            UpdatedAt = DateTime.UtcNow.AddDays(-1)
        };

        var jobWithNoDispute = new Job
        {
            Id = 102,
            EmployerId = employer.Id,
            CategoryId = category.Id,
            Title = "Job không khiếu nại",
            Description = "Mô tả công việc",
            Status = "in_progress",
            Budget = 300000,
            HiredApplicantId = student.Id,
            PostedAt = DateTime.UtcNow.AddDays(-3),
            UpdatedAt = DateTime.UtcNow.AddDays(-3)
        };

        await dbContext.Users.AddRangeAsync(employer, student);
        await dbContext.Categories.AddAsync(category);
        await dbContext.Jobs.AddRangeAsync(jobWithOpenDispute, jobWithClosedDispute, jobWithNoDispute);
        await dbContext.Disputes.AddRangeAsync(
            new Dispute
            {
                JobId = jobWithOpenDispute.Id,
                StudentId = student.Id,
                EmployerId = employer.Id,
                Amount = 500000,
                FiledBy = "student",
                Origin = "manual",
                Reason = "Nhà tuyển dụng không phản hồi",
                Status = "open",
                FiledAt = DateTime.UtcNow.AddHours(-10)
            },
            new Dispute
            {
                JobId = jobWithClosedDispute.Id,
                StudentId = student.Id,
                EmployerId = employer.Id,
                Amount = 400000,
                FiledBy = "employer",
                Origin = "manual",
                Reason = "Deliverable không đúng yêu cầu",
                Status = "closed",
                Decision = "accept",
                FiledAt = DateTime.UtcNow.AddDays(-5),
                ResolvedAt = DateTime.UtcNow.AddDays(-1)
            });
        await dbContext.SaveChangesAsync();

        var repository = new JobRepository(dbContext, _storageMock.Object);

        // Act
        var result = await repository.GetEmployerJobsPagedAsync(employer.Id, status: null, page: 1, pageSize: 20);

        // Assert
        var dto100 = result.Items.Single(i => i.Id == jobWithOpenDispute.Id);
        var dto101 = result.Items.Single(i => i.Id == jobWithClosedDispute.Id);
        var dto102 = result.Items.Single(i => i.Id == jobWithNoDispute.Id);

        Assert.True(dto100.HasOpenDispute, "Job có dispute status='open' phải có HasOpenDispute=true.");
        Assert.False(dto101.HasOpenDispute, "Job chỉ có dispute status='closed' phải có HasOpenDispute=false.");
        Assert.False(dto102.HasOpenDispute, "Job không có dispute nào phải có HasOpenDispute=false.");
    }
}
