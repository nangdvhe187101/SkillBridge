using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Applications;
using SkillBridge.Application.Interfaces.Notifications;
using SkillBridge.Application.Interfaces.Payments;
using SkillBridge.Application.Interfaces.Storage;
using SkillBridge.Application.Interfaces.Users;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Repositories.Interfaces;
using SkillBridge.Infrastructure.Services.Applications;
using Xunit;
using RealApplicationRepository = SkillBridge.Infrastructure.Repositories.Implementations.ApplicationRepository;

namespace SkillBridge.Tests.Applications;

public class ApplicationServiceTests
{
    private readonly Mock<IStorageService> _storageMock = new();
    private readonly Mock<IEscrowPaymentService> _escrowMock = new();
    private readonly Mock<IUserReliabilityService> _reliabilityMock = new();
    private readonly Mock<INotificationService> _notificationMock = new();
    private readonly Mock<ILogger<ApplicationService>> _loggerMock = new();

    private static SkillBridgeDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<SkillBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new SkillBridgeDbContext(options);
    }

    // Repository thin wrapper trực tiếp trên DbContext, đủ cho test này (không cần mock đầy đủ 9 method)
    private class DbBackedApplicationRepository : IApplicationRepository
    {
        private readonly SkillBridgeDbContext _db;
        public DbBackedApplicationRepository(SkillBridgeDbContext db) => _db = db;

        public async Task<JobApplication?> GetByIdAsync(int id) => await _db.Applications.FindAsync(id);
        public async Task<JobApplication?> GetByJobAndStudentAsync(int jobId, int studentId) =>
            await _db.Applications.FirstOrDefaultAsync(a => a.JobId == jobId && a.StudentId == studentId);
        public Task<bool> ExistsAsync(int jobId, int studentId) => Task.FromResult(false);
        public Task<System.Collections.Generic.List<JobApplication>> GetByJobIdAsync(int jobId) => Task.FromResult(new System.Collections.Generic.List<JobApplication>());
        public Task<(System.Collections.Generic.List<JobApplication> Items, int TotalCount)> GetByJobIdPagedAsync(int jobId, int page, int pageSize) =>
            Task.FromResult((new System.Collections.Generic.List<JobApplication>(), 0));
        public Task<System.Collections.Generic.List<JobApplication>> GetByStudentIdAsync(int studentId) => Task.FromResult(new System.Collections.Generic.List<JobApplication>());
        public Task<(System.Collections.Generic.List<JobApplication> Items, int TotalCount)> GetByStudentIdPagedAsync(int studentId, int page, int pageSize) =>
            Task.FromResult((new System.Collections.Generic.List<JobApplication>(), 0));
        public async Task AddAsync(JobApplication application) { await _db.Applications.AddAsync(application); await _db.SaveChangesAsync(); }
        public async Task UpdateAsync(JobApplication application) { _db.Applications.Update(application); await _db.SaveChangesAsync(); }
    }

    private class DbBackedJobRepository : IJobRepository
    {
        private readonly SkillBridgeDbContext _db;
        public DbBackedJobRepository(SkillBridgeDbContext db) => _db = db;
        public async Task<Job?> GetByIdAsync(int id) => await _db.Jobs.Include(j => j.Employer).FirstOrDefaultAsync(j => j.Id == id);
        public Task<SkillBridge.Application.DTOs.Jobs.JobDetailDto?> GetJobDetailDtoAsync(int id, int? currentUserId = null) => throw new NotImplementedException();
        public Task<SkillBridge.Application.DTOs.Jobs.PagedResult<SkillBridge.Application.DTOs.Jobs.JobSummaryDto>> GetPublicJobsPagedAsync(SkillBridge.Application.DTOs.Jobs.JobQueryParameters query, int? currentUserId = null) => throw new NotImplementedException();
        public Task<SkillBridge.Application.DTOs.Jobs.PagedResult<SkillBridge.Application.DTOs.Jobs.JobSummaryDto>> GetEmployerJobsPagedAsync(int employerId, string? status, int page, int pageSize) => throw new NotImplementedException();
        public Task<Job> CreateJobWithRequirementsAsync(Job job, System.Collections.Generic.List<string> requirements) => throw new NotImplementedException();
        public Task UpdateJobWithRequirementsAsync(Job job, System.Collections.Generic.List<string> requirements) => throw new NotImplementedException();
        public Task UpdateJobAsync(Job job) => Task.CompletedTask;
        public Task CancelJobAsync(Job job) => throw new NotImplementedException();
        public Task ReopenJobAsync(Job job) => throw new NotImplementedException();
        public Task DeleteJobAsync(Job job) => throw new NotImplementedException();
        public Task<bool> SaveJobAsync(int studentId, int jobId) => throw new NotImplementedException();
        public Task<bool> UnsaveJobAsync(int studentId, int jobId) => throw new NotImplementedException();
        public Task<SkillBridge.Application.DTOs.Jobs.PagedResult<SkillBridge.Application.DTOs.Jobs.JobSummaryDto>> GetSavedJobsPagedAsync(int studentId, int page, int pageSize) => throw new NotImplementedException();
        public Task<System.Collections.Generic.IReadOnlyList<int>> GetSavedJobIdsAsync(int studentId) => throw new NotImplementedException();
    }

    private class DbBackedCvFileRepository : ICvFileRepository
    {
        private readonly SkillBridgeDbContext _db;
        public DbBackedCvFileRepository(SkillBridgeDbContext db) => _db = db;
        public Task<System.Collections.Generic.List<CvFile>> GetByStudentIdAsync(int studentId) => throw new NotImplementedException();
        public async Task<CvFile?> GetByIdAsync(int id) => await _db.CvFiles.FindAsync(id);
        public Task AddAsync(CvFile cvFile) => throw new NotImplementedException();
        public Task UpdateAsync(CvFile cvFile) => throw new NotImplementedException();
        public Task DeleteAsync(CvFile cvFile) => throw new NotImplementedException();
    }

    private ApplicationService CreateService(SkillBridgeDbContext db) => new(
        new DbBackedApplicationRepository(db),
        new DbBackedJobRepository(db),
        new DbBackedCvFileRepository(db),
        db,
        _storageMock.Object,
        _escrowMock.Object,
        _reliabilityMock.Object,
        _notificationMock.Object,
        _loggerMock.Object);

    [Theory]
    [InlineData("rejected")]
    [InlineData("cancelled")]
    public async Task ApplyJobAsync_WhenPriorApplicationWasRejectedOrCancelled_ShouldAllowReapply(string priorStatus)
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var studentRole = new Role { Id = 2, Code = "student", Name = "Sinh viên", Type = "user", IsActive = true };
        var employerRole = new Role { Id = 3, Code = "employer", Name = "Nhà tuyển dụng", Type = "user", IsActive = true };

        var employer = new User
        {
            Id = 20,
            Email = "employer@skillbridge.vn",
            FullName = "Employer Test",
            RoleId = employerRole.Id,
            Role = employerRole,
            AccountStatus = "active",
            KycStatus = "verified",
            PasswordHash = "hash"
        };

        var student = new User
        {
            Id = 10,
            Email = "student@skillbridge.vn",
            FullName = "Student Test",
            RoleId = studentRole.Id,
            Role = studentRole,
            AccountStatus = "active",
            KycStatus = "verified",
            PasswordHash = "hash"
        };

        var job = new Job
        {
            Id = 100,
            EmployerId = employer.Id,
            Employer = employer,
            Title = "Thiết kế Banner Sự kiện",
            Description = "Mô tả chi tiết công việc",
            Status = "open",
            Budget = 500000,
            PostedAt = DateTime.UtcNow.AddDays(-5),
            UpdatedAt = DateTime.UtcNow.AddDays(-5)
        };

        var cvFile = new CvFile
        {
            Id = 1,
            StudentId = student.Id,
            FileName = "cv.pdf",
            FileUrl = "cv-files/1/cv.pdf",
            PublicId = "cv_1",
            IsSearchable = true,
            UploadedAt = DateTime.UtcNow.AddDays(-10)
        };

        var priorApplication = new JobApplication
        {
            Id = 1,
            JobId = job.Id,
            StudentId = student.Id,
            CvFileId = cvFile.Id,
            Status = priorStatus,
            AppliedAt = DateTime.UtcNow.AddDays(-3),
            UpdatedAt = DateTime.UtcNow.AddDays(-3)
        };

        // Sinh viên đã xác minh thẻ còn hiệu lực, bỏ qua nhánh awaiting_verification
        var studentProfile = new StudentProfile
        {
            UserId = student.Id,
            SchoolId = 1,
            StudentCode = "SE123456",
            StudentCodeNormalized = "SE123456",
            VerifiedFullName = student.FullName,
            VerifiedAt = DateTime.UtcNow.AddMonths(-6),
            ExpiresAt = DateTime.UtcNow.AddYears(1)
        };

        await dbContext.Roles.AddRangeAsync(studentRole, employerRole);
        await dbContext.Users.AddRangeAsync(employer, student);
        await dbContext.Jobs.AddAsync(job);
        await dbContext.CvFiles.AddAsync(cvFile);
        await dbContext.Applications.AddAsync(priorApplication);
        await dbContext.StudentProfiles.AddAsync(studentProfile);
        await dbContext.SaveChangesAsync();

        var service = CreateService(dbContext);

        // Act: sinh viên ứng tuyển lại cho đúng job đã bị rejected/cancelled trước đó
        var result = await service.ApplyJobAsync(student.Id, new ApplyJobRequest
        {
            JobId = job.Id,
            CvFileId = cvFile.Id,
            CoverLetter = "Em muốn ứng tuyển lại vào vị trí này."
        });

        // Assert: cập nhật lại đúng bản ghi cũ (không tạo đơn mới), chuyển về "pending"
        Assert.Equal("pending", result.Status);
        Assert.Equal(priorApplication.Id, result.Id);

        var appsForJob = await dbContext.Applications.Where(a => a.JobId == job.Id && a.StudentId == student.Id).ToListAsync();
        Assert.Single(appsForJob);
        Assert.Equal("pending", appsForJob[0].Status);
    }

    [Fact]
    public async Task ApplyJobAsync_WhenPriorApplicationIsPending_ShouldThrowBusinessException()
    {
        // Arrange: xác nhận ngược lại - không cho nộp trùng khi đơn cũ vẫn còn đang chờ xử lý
        using var dbContext = CreateInMemoryDbContext();
        var studentRole = new Role { Id = 2, Code = "student", Name = "Sinh viên", Type = "user", IsActive = true };
        var employerRole = new Role { Id = 3, Code = "employer", Name = "Nhà tuyển dụng", Type = "user", IsActive = true };

        var employer = new User
        {
            Id = 21,
            Email = "employer2@skillbridge.vn",
            FullName = "Employer Test 2",
            RoleId = employerRole.Id,
            Role = employerRole,
            AccountStatus = "active",
            KycStatus = "verified",
            PasswordHash = "hash"
        };

        var student = new User
        {
            Id = 11,
            Email = "student2@skillbridge.vn",
            FullName = "Student Test 2",
            RoleId = studentRole.Id,
            Role = studentRole,
            AccountStatus = "active",
            KycStatus = "verified",
            PasswordHash = "hash"
        };

        var job = new Job
        {
            Id = 101,
            EmployerId = employer.Id,
            Employer = employer,
            Title = "Viết nội dung Blog",
            Description = "Mô tả chi tiết công việc",
            Status = "open",
            Budget = 300000,
            PostedAt = DateTime.UtcNow.AddDays(-5),
            UpdatedAt = DateTime.UtcNow.AddDays(-5)
        };

        var cvFile = new CvFile
        {
            Id = 2,
            StudentId = student.Id,
            FileName = "cv2.pdf",
            FileUrl = "cv-files/2/cv2.pdf",
            PublicId = "cv_2",
            IsSearchable = true,
            UploadedAt = DateTime.UtcNow.AddDays(-10)
        };

        var priorApplication = new JobApplication
        {
            Id = 2,
            JobId = job.Id,
            StudentId = student.Id,
            CvFileId = cvFile.Id,
            Status = "pending",
            AppliedAt = DateTime.UtcNow.AddDays(-1),
            UpdatedAt = DateTime.UtcNow.AddDays(-1)
        };

        var studentProfile = new StudentProfile
        {
            UserId = student.Id,
            SchoolId = 1,
            StudentCode = "SE654321",
            StudentCodeNormalized = "SE654321",
            VerifiedFullName = student.FullName,
            VerifiedAt = DateTime.UtcNow.AddMonths(-6),
            ExpiresAt = DateTime.UtcNow.AddYears(1)
        };

        await dbContext.Roles.AddRangeAsync(studentRole, employerRole);
        await dbContext.Users.AddRangeAsync(employer, student);
        await dbContext.Jobs.AddAsync(job);
        await dbContext.CvFiles.AddAsync(cvFile);
        await dbContext.Applications.AddAsync(priorApplication);
        await dbContext.StudentProfiles.AddAsync(studentProfile);
        await dbContext.SaveChangesAsync();

        var service = CreateService(dbContext);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.ApplyJobAsync(student.Id, new ApplyJobRequest { JobId = job.Id, CvFileId = cvFile.Id }));

        Assert.Contains("đã gửi đơn ứng tuyển", ex.Message);
    }

    [Fact]
    public async Task GetMyApplicationsAsync_WhenJobHasOpenDispute_ShouldSetHasOpenDisputeTrue()
    {
        // Arrange: dùng ApplicationRepository thật để xác nhận cả Include(j => j.Disputes)
        // và phép tính HasOpenDispute trong ApplicationService hoạt động đúng với nhau.
        using var dbContext = CreateInMemoryDbContext();
        var studentRole = new Role { Id = 2, Code = "student", Name = "Sinh viên", Type = "user", IsActive = true };
        var employerRole = new Role { Id = 3, Code = "employer", Name = "Nhà tuyển dụng", Type = "user", IsActive = true };

        var employer = new User
        {
            Id = 22,
            Email = "employer3@skillbridge.vn",
            FullName = "Employer Test 3",
            RoleId = employerRole.Id,
            Role = employerRole,
            AccountStatus = "active",
            KycStatus = "verified",
            PasswordHash = "hash"
        };

        var student = new User
        {
            Id = 12,
            Email = "student3@skillbridge.vn",
            FullName = "Student Test 3",
            RoleId = studentRole.Id,
            Role = studentRole,
            AccountStatus = "active",
            KycStatus = "verified",
            PasswordHash = "hash"
        };

        var jobDisputed = new Job
        {
            Id = 102,
            EmployerId = employer.Id,
            Employer = employer,
            Title = "Job đang bị khiếu nại",
            Description = "Mô tả chi tiết công việc",
            Status = "in_progress",
            Budget = 500000,
            HiredApplicantId = student.Id,
            PostedAt = DateTime.UtcNow.AddDays(-5),
            UpdatedAt = DateTime.UtcNow.AddDays(-5)
        };

        var jobNormal = new Job
        {
            Id = 103,
            EmployerId = employer.Id,
            Employer = employer,
            Title = "Job bình thường",
            Description = "Mô tả chi tiết công việc",
            Status = "in_progress",
            Budget = 300000,
            HiredApplicantId = student.Id,
            PostedAt = DateTime.UtcNow.AddDays(-3),
            UpdatedAt = DateTime.UtcNow.AddDays(-3)
        };

        var appDisputed = new JobApplication
        {
            Id = 3,
            JobId = jobDisputed.Id,
            StudentId = student.Id,
            Status = "hired",
            AppliedAt = DateTime.UtcNow.AddDays(-5),
            UpdatedAt = DateTime.UtcNow.AddDays(-5)
        };

        var appNormal = new JobApplication
        {
            Id = 4,
            JobId = jobNormal.Id,
            StudentId = student.Id,
            Status = "hired",
            AppliedAt = DateTime.UtcNow.AddDays(-3),
            UpdatedAt = DateTime.UtcNow.AddDays(-3)
        };

        await dbContext.Roles.AddRangeAsync(studentRole, employerRole);
        await dbContext.Users.AddRangeAsync(employer, student);
        await dbContext.Jobs.AddRangeAsync(jobDisputed, jobNormal);
        await dbContext.Applications.AddRangeAsync(appDisputed, appNormal);
        await dbContext.Disputes.AddAsync(new Dispute
        {
            JobId = jobDisputed.Id,
            StudentId = student.Id,
            EmployerId = employer.Id,
            Amount = 500000,
            FiledBy = "student",
            Origin = "manual",
            Reason = "Nhà tuyển dụng không phản hồi quá 48 giờ",
            Status = "open",
            FiledAt = DateTime.UtcNow.AddHours(-10)
        });
        await dbContext.SaveChangesAsync();

        var realApplicationRepository = new RealApplicationRepository(dbContext);
        var service = new ApplicationService(
            realApplicationRepository,
            new DbBackedJobRepository(dbContext),
            new DbBackedCvFileRepository(dbContext),
            dbContext,
            _storageMock.Object,
            _escrowMock.Object,
            _reliabilityMock.Object,
            _notificationMock.Object,
            _loggerMock.Object);

        // Act
        var result = await service.GetMyApplicationsAsync(student.Id);

        // Assert
        var dtoDisputed = result.Items.Single(i => i.JobId == jobDisputed.Id);
        var dtoNormal = result.Items.Single(i => i.JobId == jobNormal.Id);

        Assert.True(dtoDisputed.HasOpenDispute, "Đơn ứng tuyển cho job có dispute status='open' phải có HasOpenDispute=true.");
        Assert.False(dtoNormal.HasOpenDispute, "Đơn ứng tuyển cho job không có dispute phải có HasOpenDispute=false.");
    }
}
