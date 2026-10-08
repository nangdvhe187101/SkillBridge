using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs;
using SkillBridge.Application.Interfaces.Storage;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Services.Users;
using Xunit;

namespace SkillBridge.Tests.Users
{
    public class StudentVerificationServiceTests
    {
        private readonly Mock<ILogger<StudentVerificationService>> _loggerMock = new();
        private readonly Mock<IStorageService> _storageServiceMock = new();

        public StudentVerificationServiceTests()
        {
            _storageServiceMock.Setup(s => s.GetPublicUrl(It.IsAny<string>()))
                .Returns<string>(url => url ?? string.Empty);
        }

        private SkillBridgeDbContext CreateInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<SkillBridgeDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            return new SkillBridgeDbContext(options);
        }

        private async Task SeedDataAsync(SkillBridgeDbContext db)
        {
            var school = new School
            {
                Id = 1,
                Name = "Đại học FPT",
                ShortName = "FPTU",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            db.Schools.Add(school);

            var user1 = new User
            {
                Id = 10,
                FullName = "Sinh Viên A",
                Email = "studentA@gmail.com",
                PasswordHash = "hash",
                RoleId = 2,
                AccountStatus = "active",
                KycStatus = "pending"
            };
            var user2 = new User
            {
                Id = 20,
                FullName = "Sinh Viên B",
                Email = "studentB@gmail.com",
                PasswordHash = "hash",
                RoleId = 2,
                AccountStatus = "active",
                KycStatus = "pending"
            };
            db.Users.AddRange(user1, user2);

            await db.SaveChangesAsync();
        }

        [Fact]
        public async Task SubmitVerificationAsync_WithValidData_ShouldCreatePendingRequestAndDocuments()
        {
            // Arrange
            using var db = CreateInMemoryDbContext();
            await SeedDataAsync(db);
            var service = new StudentVerificationService(db, _loggerMock.Object, _storageServiceMock.Object);

            var dto = new SubmitStudentVerificationDto
            {
                SchoolId = 1,
                StudentCode = "SE187101",
                FullNameOnCard = "Đặng Văn Năng",
                GraduationYear = 2026,
                FrontCardUrl = "https://cdn.skillbridge.vn/cards/front.jpg",
                BackCardUrl = "https://cdn.skillbridge.vn/cards/back.jpg"
            };

            // Act
            var result = await service.SubmitVerificationAsync(10, dto);

            // Assert
            Assert.NotNull(result);
            Assert.Equal("pending", result.Status);
            Assert.Equal("SE187101", result.StudentCode);

            var requestInDb = await db.StudentVerificationRequests
                .Include(r => r.Documents)
                .FirstOrDefaultAsync(r => r.UserId == 10);

            Assert.NotNull(requestInDb);
            Assert.Equal("SE187101", requestInDb.StudentCodeNormalized);
            Assert.Equal(2, requestInDb.Documents.Count);
        }

        [Fact]
        public async Task SubmitVerificationAsync_WithDuplicatedStudentCode_ShouldThrowBusinessException()
        {
            // Arrange
            using var db = CreateInMemoryDbContext();
            await SeedDataAsync(db);

            // Giả lập user 10 đã được verified MSSV SE187101
            db.StudentProfiles.Add(new StudentProfile
            {
                UserId = 10,
                SchoolId = 1,
                StudentCode = "SE187101",
                StudentCodeNormalized = "SE187101",
                VerifiedFullName = "Đặng Văn Năng",
                GraduationYear = 2026,
                VerifiedAt = DateTime.UtcNow,
                SourceRequestId = 1
            });
            await db.SaveChangesAsync();

            var service = new StudentVerificationService(db, _loggerMock.Object, _storageServiceMock.Object);

            // User 20 cố tình nhập trùng MSSV SE187101
            var dto = new SubmitStudentVerificationDto
            {
                SchoolId = 1,
                StudentCode = "se 187101", // test normalization
                FullNameOnCard = "Sinh Viên Khác",
                GraduationYear = 2026,
                FrontCardUrl = "https://cdn.skillbridge.vn/cards/front2.jpg"
            };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BusinessException>(() => service.SubmitVerificationAsync(20, dto));
            Assert.Contains("đã được liên kết với một tài khoản sinh viên đã xác minh khác", ex.Message);
        }

        [Fact]
        public async Task SubmitVerificationAsync_WhenExistingPendingRequest_ShouldThrowBusinessException()
        {
            // Arrange
            using var db = CreateInMemoryDbContext();
            await SeedDataAsync(db);

            db.StudentVerificationRequests.Add(new StudentVerificationRequest
            {
                UserId = 10,
                SchoolId = 1,
                StudentCode = "SE187101",
                StudentCodeNormalized = "SE187101",
                FullNameOnCard = "Đặng Văn Năng",
                GraduationYear = 2026,
                Status = "pending"
            });
            await db.SaveChangesAsync();

            var service = new StudentVerificationService(db, _loggerMock.Object, _storageServiceMock.Object);
            var dto = new SubmitStudentVerificationDto
            {
                SchoolId = 1,
                StudentCode = "SE187101",
                FullNameOnCard = "Đặng Văn Năng",
                GraduationYear = 2026,
                FrontCardUrl = "https://cdn.skillbridge.vn/cards/front.jpg"
            };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<BusinessException>(() => service.SubmitVerificationAsync(10, dto));
            Assert.Contains("đang có một yêu cầu xác minh thẻ sinh viên đang chờ duyệt", ex.Message);
        }

        [Fact]
        public async Task ReviewVerificationAsync_Approve_ShouldLockProfileAndSetExpiresAtToEndOfYear()
        {
            // Arrange
            using var db = CreateInMemoryDbContext();
            await SeedDataAsync(db);

            var request = new StudentVerificationRequest
            {
                Id = 100,
                UserId = 10,
                SchoolId = 1,
                StudentCode = "SE187101",
                StudentCodeNormalized = "SE187101",
                FullNameOnCard = "Đặng Văn Năng",
                GraduationYear = 2026,
                Status = "pending",
                SubmittedAt = DateTime.UtcNow
            };
            db.StudentVerificationRequests.Add(request);
            await db.SaveChangesAsync();

            var service = new StudentVerificationService(db, _loggerMock.Object, _storageServiceMock.Object);

            var reviewDto = new AdminReviewVerificationDto
            {
                Decision = "approve",
                AdminNote = "Thẻ rõ nét, thông tin chuẩn xác"
            };

            // Act
            var result = await service.ReviewVerificationAsync(100, 999, reviewDto);

            // Assert
            Assert.Equal("approved", result.Status);

            var profile = await db.StudentProfiles.FirstOrDefaultAsync(p => p.UserId == 10);
            Assert.NotNull(profile);
            Assert.Equal("SE187101", profile.StudentCode);
            Assert.Equal("Đặng Văn Năng", profile.VerifiedFullName);
            Assert.Equal(2026, profile.GraduationYear);

            // Kiểm tra hạn mốc hết năm: 2026-12-31 23:59:59
            Assert.NotNull(profile.ExpiresAt);
            Assert.Equal(2026, profile.ExpiresAt.Value.Year);
            Assert.Equal(12, profile.ExpiresAt.Value.Month);
            Assert.Equal(31, profile.ExpiresAt.Value.Day);

            var user = await db.Users.FindAsync(10);
            Assert.NotNull(user);
            Assert.Equal("verified", user.KycStatus);

            var notif = await db.Notifications.FirstOrDefaultAsync(n => n.UserId == 10);
            Assert.NotNull(notif);
            Assert.Equal("student_verified", notif.Type);
        }

        [Fact]
        public async Task ReviewVerificationAsync_NeedMoreInfo_ShouldUpdateStatusAndNotification()
        {
            // Arrange
            using var db = CreateInMemoryDbContext();
            await SeedDataAsync(db);

            var request = new StudentVerificationRequest
            {
                Id = 101,
                UserId = 10,
                SchoolId = 1,
                StudentCode = "SE187101",
                StudentCodeNormalized = "SE187101",
                FullNameOnCard = "Đặng Văn Năng",
                GraduationYear = 2026,
                Status = "pending",
                SubmittedAt = DateTime.UtcNow
            };
            db.StudentVerificationRequests.Add(request);
            await db.SaveChangesAsync();

            var service = new StudentVerificationService(db, _loggerMock.Object, _storageServiceMock.Object);

            var reviewDto = new AdminReviewVerificationDto
            {
                Decision = "need_more_info",
                ReasonCode = "BLURRY_IMAGE",
                UserMessage = "Ảnh thẻ bị mờ phần MSSV, vui lòng chụp lại rõ nét hơn.",
                NeedInfoDeadlineDays = 5
            };

            // Act
            var result = await service.ReviewVerificationAsync(101, 999, reviewDto);

            // Assert
            Assert.Equal("need_more_info", result.Status);
            Assert.Equal("BLURRY_IMAGE", result.ReasonCode);
            Assert.NotNull(result.NeedInfoDeadline);

            var notif = await db.Notifications.FirstOrDefaultAsync(n => n.UserId == 10);
            Assert.NotNull(notif);
            Assert.Equal("student_need_info", notif.Type);
        }

        [Fact]
        public async Task ReviewVerificationAsync_Reject_ShouldSetPurgeAfter30Days()
        {
            // Arrange
            using var db = CreateInMemoryDbContext();
            await SeedDataAsync(db);

            var request = new StudentVerificationRequest
            {
                Id = 102,
                UserId = 10,
                SchoolId = 1,
                StudentCode = "SE187101",
                StudentCodeNormalized = "SE187101",
                FullNameOnCard = "Đặng Văn Năng",
                GraduationYear = 2026,
                Status = "pending",
                SubmittedAt = DateTime.UtcNow
            };
            db.StudentVerificationRequests.Add(request);

            var doc = new IdentityDocument
            {
                Id = 50,
                UserId = 10,
                VerificationRequestId = 102,
                DocType = "student_card",
                Side = "front",
                FileName = "test.jpg",
                FileUrl = "https://cdn.skillbridge.vn/cards/test.jpg",
                PublicId = "test_50",
                FileType = "image/jpeg",
                FileSize = 100,
                PurgeAfter = DateTime.UtcNow.AddDays(90)
            };
            db.IdentityDocuments.Add(doc);
            await db.SaveChangesAsync();

            var service = new StudentVerificationService(db, _loggerMock.Object, _storageServiceMock.Object);

            var reviewDto = new AdminReviewVerificationDto
            {
                Decision = "reject",
                ReasonCode = "NOT_A_STUDENT_CARD",
                RejectionReason = "Ảnh bạn tải lên không phải là thẻ sinh viên hợp lệ."
            };

            // Act
            var result = await service.ReviewVerificationAsync(102, 999, reviewDto);

            // Assert
            Assert.Equal("rejected", result.Status);
            Assert.Equal("NOT_A_STUDENT_CARD", result.ReasonCode);

            var docInDb = await db.IdentityDocuments.FindAsync(50);
            Assert.NotNull(docInDb);
            Assert.NotNull(docInDb.PurgeAfter);
            // PurgeAfter được rút ngắn xuống khoảng 30 ngày thay vì 90 ngày
            var daysRemaining = (docInDb.PurgeAfter.Value - DateTime.UtcNow).TotalDays;
            Assert.InRange(daysRemaining, 28, 31);
        }

        [Fact]
        public async Task ReviewVerificationAsync_Approve_ShouldActivateAwaitingApplications()
        {
            // Arrange
            using var db = CreateInMemoryDbContext();
            await SeedDataAsync(db);

            var job = new Job
            {
                Id = 1,
                EmployerId = 20,
                Title = "Thiết kế Banner Sự kiện",
                Description = "Mô tả chi tiết công việc thiết kế banner",
                Status = "open",
                PostedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            db.Jobs.Add(job);

            var app = new JobApplication
            {
                Id = 1,
                JobId = 1,
                StudentId = 10,
                Status = "awaiting_verification",
                AppliedAt = DateTime.UtcNow.AddDays(-1),
                UpdatedAt = DateTime.UtcNow.AddDays(-1)
            };
            db.Applications.Add(app);

            var req = new StudentVerificationRequest
            {
                Id = 200,
                UserId = 10,
                SchoolId = 1,
                StudentCode = "SE187101",
                StudentCodeNormalized = "SE187101",
                FullNameOnCard = "Đặng Văn Năng",
                GraduationYear = 2026,
                Status = "pending",
                SubmittedAt = DateTime.UtcNow.AddDays(-1)
            };
            db.StudentVerificationRequests.Add(req);
            await db.SaveChangesAsync();

            var service = new StudentVerificationService(db, _loggerMock.Object, _storageServiceMock.Object);

            // Act
            var result = await service.ReviewVerificationAsync(200, 999, new AdminReviewVerificationDto { Decision = "approve" });

            // Assert
            Assert.Equal("approved", result.Status);

            var updatedApp = await db.Applications.FindAsync(1);
            Assert.NotNull(updatedApp);
            Assert.Equal("pending", updatedApp.Status);

            var notifToEmployer = await db.Notifications.FirstOrDefaultAsync(n => n.UserId == 20);
            Assert.NotNull(notifToEmployer);
            Assert.Contains("Đặng Văn Năng", notifToEmployer.MessageText);
        }

        [Fact]
        public async Task SubmitVerificationAsync_WhenExistingVerifiedStudent_ShouldSetRequestTypeUpdateAndHoldWallet()
        {
            // Arrange
            using var db = CreateInMemoryDbContext();
            await SeedDataAsync(db);
            var service = new StudentVerificationService(db, _loggerMock.Object, _storageServiceMock.Object);

            db.StudentProfiles.Add(new StudentProfile
            {
                UserId = 10,
                SchoolId = 1,
                StudentCode = "SE187101",
                StudentCodeNormalized = "SE187101",
                VerifiedFullName = "Đặng Văn Năng",
                GraduationYear = 2026,
                VerifiedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddYears(1),
                SourceRequestId = 1
            });
            db.Wallets.Add(new Wallet
            {
                UserId = 10,
                Balance = 1000000,
                AccountHolder = "DANG VAN NANG",
                AccountNumber = "0123456789",
                BankName = "TPBank",
                IsBankVerified = true
            });
            await db.SaveChangesAsync();

            var dto = new SubmitStudentVerificationDto
            {
                SchoolId = 1,
                StudentCode = "SE187102",
                FullNameOnCard = "Đặng Văn Năng Mới",
                GraduationYear = 2027,
                FrontCardUrl = "https://cdn.skillbridge.vn/cards/front_new.jpg"
            };

            // Act
            var result = await service.SubmitVerificationAsync(10, dto);

            // Assert
            Assert.NotNull(result);
            var reqInDb = await db.StudentVerificationRequests.FindAsync(result.Id);
            Assert.NotNull(reqInDb);
            Assert.Equal("update", reqInDb.RequestType);

            var wallet = await db.Wallets.FindAsync(10);
            Assert.NotNull(wallet);
            Assert.NotNull(wallet.WithdrawHoldReason);
            Assert.True(wallet.WithdrawHoldUntil > DateTime.UtcNow);
        }

        [Fact]
        public async Task ReviewVerificationAsync_WhenApproved_ShouldReleaseWalletHold()
        {
            // Arrange
            using var db = CreateInMemoryDbContext();
            await SeedDataAsync(db);
            var service = new StudentVerificationService(db, _loggerMock.Object, _storageServiceMock.Object);

            db.Wallets.Add(new Wallet
            {
                UserId = 10,
                Balance = 1000000,
                AccountHolder = "DANG VAN NANG",
                AccountNumber = "0123456789",
                BankName = "TPBank",
                IsBankVerified = true,
                WithdrawHoldReason = "Đang chờ duyệt hồ sơ thay đổi định danh / thẻ sinh viên",
                WithdrawHoldUntil = DateTime.UtcNow.AddDays(7)
            });

            var req = new StudentVerificationRequest
            {
                Id = 300,
                UserId = 10,
                SchoolId = 1,
                StudentCode = "SE187102",
                StudentCodeNormalized = "SE187102",
                FullNameOnCard = "Đặng Văn Năng",
                GraduationYear = 2027,
                Status = "pending",
                RequestType = "update",
                SubmittedAt = DateTime.UtcNow
            };
            db.StudentVerificationRequests.Add(req);
            await db.SaveChangesAsync();

            // Act
            await service.ReviewVerificationAsync(300, 999, new AdminReviewVerificationDto { Decision = "approve" });

            // Assert
            var wallet = await db.Wallets.FindAsync(10);
            Assert.NotNull(wallet);
            Assert.Null(wallet.WithdrawHoldReason);
            Assert.Null(wallet.WithdrawHoldUntil);
        }
    }
}
