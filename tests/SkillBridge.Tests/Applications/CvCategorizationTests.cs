using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Applications;
using SkillBridge.Application.Interfaces.Storage;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Repositories.Interfaces;
using SkillBridge.Infrastructure.Services.Applications;
using Xunit;

namespace SkillBridge.Tests.Applications;

public class CvCategorizationTests
{
    private readonly Mock<ICvFileRepository> _cvRepoMock;
    private readonly Mock<ICategoryRepository> _catRepoMock;
    private readonly Mock<IStorageService> _storageMock;
    private readonly Mock<ILogger<CvService>> _loggerMock;
    private readonly SkillBridgeDbContext _dbContext;

    public CvCategorizationTests()
    {
        _cvRepoMock = new Mock<ICvFileRepository>();
        _catRepoMock = new Mock<ICategoryRepository>();
        _storageMock = new Mock<IStorageService>();
        _loggerMock = new Mock<ILogger<CvService>>();

        var options = new DbContextOptionsBuilder<SkillBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: $"CvCategorizationTests_{Guid.NewGuid()}")
            .Options;
        _dbContext = new SkillBridgeDbContext(options);
    }

    private CvService CreateService()
    {
        return new CvService(
            _cvRepoMock.Object,
            _catRepoMock.Object,
            _storageMock.Object,
            _dbContext,
            _loggerMock.Object);
    }

    [Fact]
    public async Task UpdateCvAsync_WhenCvNotFound_ShouldThrowBusinessException()
    {
        // Arrange
        _cvRepoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((CvFile?)null);
        var service = CreateService();

        var request = new UpdateCvRequest
        {
            Label = "Test Label",
            CategoryId = 1,
            IsSearchable = true
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() => service.UpdateCvAsync(10, 999, request));
        Assert.Contains("CV không tồn tại hoặc bạn không có quyền chỉnh sửa", ex.Message);
    }

    [Fact]
    public async Task UpdateCvAsync_WhenCvOwnedByAnotherStudent_ShouldThrowBusinessException()
    {
        // Arrange
        var cv = new CvFile
        {
            Id = 5,
            StudentId = 20, // Different student
            FileName = "cv.pdf",
            FileUrl = "https://localhost/uploads/cv.pdf"
        };
        _cvRepoMock.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(cv);
        var service = CreateService();

        var request = new UpdateCvRequest
        {
            Label = "Test Label",
            CategoryId = 1,
            IsSearchable = true
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() => service.UpdateCvAsync(10, 5, request));
        Assert.Contains("CV không tồn tại hoặc bạn không có quyền chỉnh sửa", ex.Message);
    }

    [Fact]
    public async Task UpdateCvAsync_WhenCategoryNotFound_ShouldThrowBusinessException()
    {
        // Arrange
        var cv = new CvFile
        {
            Id = 5,
            StudentId = 10,
            FileName = "cv.pdf",
            FileUrl = "https://localhost/uploads/cv.pdf"
        };
        _cvRepoMock.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(cv);
        _catRepoMock.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((Category?)null);
        var service = CreateService();

        var request = new UpdateCvRequest
        {
            Label = "Test Label",
            CategoryId = 99,
            IsSearchable = true
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() => service.UpdateCvAsync(10, 5, request));
        Assert.Contains("Danh mục nghề nghiệp không tồn tại", ex.Message);
    }

    [Fact]
    public async Task UpdateCvAsync_WhenValidRequest_ShouldUpdateCvAndReturnDto()
    {
        // Arrange
        var cv = new CvFile
        {
            Id = 5,
            StudentId = 10,
            FileName = "cv.pdf",
            FileUrl = "https://localhost/uploads/cv.pdf",
            FileSize = 1024,
            Label = "Old Label",
            CategoryId = 1,
            IsSearchable = false,
            UploadedAt = DateTime.UtcNow.AddDays(-1)
        };
        var cat = new Category
        {
            Id = 2,
            Name = "Công nghệ thông tin"
        };

        _cvRepoMock.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(cv);
        _catRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(cat);
        _cvRepoMock.Setup(r => r.UpdateAsync(It.IsAny<CvFile>())).Returns(Task.CompletedTask);

        var service = CreateService();
        var request = new UpdateCvRequest
        {
            Label = "CV React Frontend Developer",
            CategoryId = 2,
            IsSearchable = true
        };

        // Act
        var result = await service.UpdateCvAsync(10, 5, request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(5, result.Id);
        Assert.Equal("CV React Frontend Developer", result.Label);
        Assert.Equal(2, result.CategoryId);
        Assert.Equal("Công nghệ thông tin", result.CategoryName);
        Assert.True(result.IsSearchable);
        _cvRepoMock.Verify(r => r.UpdateAsync(It.Is<CvFile>(c => c.CategoryId == 2 && c.Label == "CV React Frontend Developer")), Times.Once);
    }

    [Fact]
    public async Task UpdateCvAsync_WithRealRepository_ShouldUpdateSuccessfully()
    {
        var category1 = new Category { Id = 1, Name = "Thiết kế đồ hoạ", PreviewStrategy = "watermark_image" };
        var category2 = new Category { Id = 2, Name = "Lập trình web", PreviewStrategy = "sample_rows" };
        _dbContext.Categories.AddRange(category1, category2);

        var cv = new CvFile
        {
            Id = 101,
            StudentId = 13,
            FileName = "SkillBridge_EXE201.docx",
            FileUrl = "https://localhost/uploads/test.docx",
            PublicId = "test_pid",
            FileSize = 1024,
            Label = "SkillBridge_EXE201.docx",
            CategoryId = null,
            IsSearchable = true,
            UploadedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _dbContext.CvFiles.Add(cv);
        await _dbContext.SaveChangesAsync();

        var cvRepo = new SkillBridge.Infrastructure.Repositories.Implementations.CvFileRepository(_dbContext);
        var catRepo = new SkillBridge.Infrastructure.Repositories.Implementations.CategoryRepository(_dbContext);
        var service = new CvService(cvRepo, catRepo, _storageMock.Object, _dbContext, _loggerMock.Object);

        var request = new UpdateCvRequest
        {
            Label = "CV Kỹ sư phần mềm",
            CategoryId = 2,
            IsSearchable = true
        };

        var result = await service.UpdateCvAsync(13, 101, request);
        Assert.Equal(2, result.CategoryId);
        Assert.Equal("Lập trình web", result.CategoryName);

        // Update again from Category 2 to Category 1
        var request2 = new UpdateCvRequest
        {
            Label = "CV Thiết kế",
            CategoryId = 1,
            IsSearchable = false
        };
        var result2 = await service.UpdateCvAsync(13, 101, request2);
        Assert.Equal(1, result2.CategoryId);
        Assert.Equal("Thiết kế đồ hoạ", result2.CategoryName);
    }

    [Fact]
    public async Task UploadCvAsync_WhenCategoryIdMissing_ShouldThrowBusinessException()
    {
        // Arrange
        var service = CreateService();
        var request = new UploadCvRequest
        {
            FileName = "my_cv.pdf",
            FileUrl = "https://localhost/uploads/cv.pdf",
            FileSize = 1024,
            CategoryId = null // Missing category
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() => service.UploadCvAsync(10, request));
        Assert.Contains("Vui lòng chọn ngành nghề phù hợp cho CV", ex.Message);
    }

    [Fact]
    public async Task UploadCvBinaryAsync_WhenCategoryIdMissing_ShouldThrowBusinessException()
    {
        // Arrange
        var service = CreateService();
        using var stream = new MemoryStream(new byte[] { 0x25, 0x50, 0x44, 0x46 }); // PDF magic header

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() => service.UploadCvBinaryAsync(
            10,
            stream,
            "test.pdf",
            "application/pdf",
            "My CV",
            null)); // Missing categoryId

        Assert.Contains("Vui lòng chọn ngành nghề phù hợp cho CV", ex.Message);
    }

    [Fact]
    public async Task UploadCvAsync_WhenMaxQuotaExceeded_ShouldThrowBusinessException()
    {
        // Arrange
        // Add 5 existing CVs to dbContext for student 10
        for (int i = 1; i <= 5; i++)
        {
            _dbContext.CvFiles.Add(new CvFile
            {
                Id = 100 + i,
                StudentId = 10,
                FileName = $"cv_{i}.pdf",
                FileUrl = $"https://localhost/uploads/cv_{i}.pdf",
                PublicId = $"pub_{i}",
                FileSize = 1024,
                IsSearchable = true,
                UploadedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }
        await _dbContext.SaveChangesAsync();

        var service = CreateService();
        var request = new UploadCvRequest
        {
            FileName = "cv_6.pdf",
            FileUrl = "https://localhost/uploads/cv_6.pdf",
            FileSize = 1024,
            CategoryId = 1
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() => service.UploadCvAsync(10, request));
        Assert.Contains("giới hạn tối đa 5 bản CV", ex.Message);
    }

    [Fact]
    public async Task DeleteCvAsync_WhenCvHasPendingJobApplication_ShouldThrowBusinessException()
    {
        // Arrange
        var cv = new CvFile
        {
            Id = 55,
            StudentId = 10,
            FileName = "applied_cv.pdf",
            FileUrl = "https://localhost/uploads/applied_cv.pdf",
            PublicId = "cv_55_pub"
        };
        _cvRepoMock.Setup(r => r.GetByIdAsync(55)).ReturnsAsync(cv);

        var job = new Job
        {
            Id = 201,
            Title = "Lập trình viên React Native",
            Description = "Tuyển dụng",
            Status = "open",
            Location = "Hà Nội",
            EmployerId = 99
        };
        _dbContext.Jobs.Add(job);

        var application = new JobApplication
        {
            Id = 301,
            JobId = 201,
            StudentId = 10,
            CvFileId = 55,
            Status = "pending",
            AppliedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _dbContext.Applications.Add(application);
        await _dbContext.SaveChangesAsync();

        var service = CreateService();

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() => service.DeleteCvAsync(10, 55));
        Assert.Contains("đang được sử dụng trong đơn ứng tuyển chờ duyệt", ex.Message);
        Assert.Contains("Lập trình viên React Native", ex.Message);
    }
}
