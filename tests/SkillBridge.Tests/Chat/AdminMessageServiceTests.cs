using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using SkillBridge.Application.DTOs.Admin;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Services.Admin;
using Xunit;

namespace SkillBridge.Tests.Chat;

public class AdminMessageServiceTests
{
    private readonly Mock<ILogger<AdminMessageService>> _loggerMock = new();

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
    public async Task GetConversationsAsync_ShouldDetectSuspiciousKeywords_AndMarkAsWarned()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new AdminMessageService(dbContext, _loggerMock.Object);

        var student = CreateUser(1, "student@test.com", "Sinh Vien A", "talent");
        var employer = CreateUser(2, "employer@test.com", "Cong Ty B", "employer");
        dbContext.Users.AddRange(student, employer);

        var conversation = new Conversation
        {
            Id = 1,
            UserAId = student.Id,
            UserBId = employer.Id,
            CreatedAt = DateTime.UtcNow,
            LastMessageAt = DateTime.UtcNow
        };
        dbContext.Conversations.Add(conversation);

        // Tin nhắn chứa từ khóa kéo ngoài sàn "zalo"
        var msg = new ChatMessage
        {
            Id = 10,
            ConversationId = 1,
            SenderId = employer.Id,
            MessageText = "Em kết bạn qua zalo 0912345678 trao đổi riêng nhé",
            SentAt = DateTime.UtcNow
        };
        dbContext.ChatMessages.Add(msg);
        await dbContext.SaveChangesAsync();

        // Act
        var result = await service.GetConversationsAsync();

        // Assert
        Assert.NotNull(result);
        Assert.Equal(1, result.TotalCount);
        Assert.Equal(1, result.WarnedCount);
        var item = Assert.Single(result.Items);
        Assert.Equal("warned", item.Status);
        Assert.Contains("zalo", item.RiskFlag?.ToLowerInvariant() ?? "");
    }

    [Fact]
    public async Task GetConversationDetailAsync_ShouldReturnMessages_AndRecordAuditLog()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new AdminMessageService(dbContext, _loggerMock.Object);

        var adminUser = CreateUser(99, "admin@skillbridge.vn", "Super Admin", "admin");
        var student = CreateUser(3, "sv3@test.com", "Sinh Vien 3", "talent");
        var employer = CreateUser(4, "ntd4@test.com", "Doanh Nghiep 4", "employer");
        dbContext.Users.AddRange(adminUser, student, employer);

        var conv = new Conversation
        {
            Id = 2,
            UserAId = student.Id,
            UserBId = employer.Id,
            CreatedAt = DateTime.UtcNow
        };
        dbContext.Conversations.Add(conv);

        dbContext.ChatMessages.AddRange(
            new ChatMessage { Id = 20, ConversationId = 2, SenderId = student.Id, MessageText = "Chào anh", SentAt = DateTime.UtcNow.AddMinutes(-5) },
            new ChatMessage { Id = 21, ConversationId = 2, SenderId = employer.Id, MessageText = "Chào em, nhận việc nhé", SentAt = DateTime.UtcNow.AddMinutes(-3) }
        );
        await dbContext.SaveChangesAsync();

        // Act (Q-006 / Q-015: Truy xuất đối soát)
        var detail = await service.GetConversationDetailAsync(adminUser.Id, 2);

        // Assert
        Assert.NotNull(detail);
        Assert.Equal(2, detail.Messages.Count);
        Assert.Equal("Sinh Vien 3", detail.Messages[0].SenderName);

        // Kiểm tra AuditLog được ghi lại
        var audit = await dbContext.AuditLogs.FirstOrDefaultAsync();
        Assert.NotNull(audit);
        Assert.Contains("Truy xuất lịch sử chat", audit.ActionText);
    }

    [Fact]
    public async Task WarnConversationAsync_ShouldInsertSystemWarningMessage_AndRecordAuditLog()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new AdminMessageService(dbContext, _loggerMock.Object);

        var adminUser = CreateUser(99, "admin@skillbridge.vn", "Super Admin", "admin");
        var student = CreateUser(5, "sv5@test.com", "Sinh Vien 5", "talent");
        var employer = CreateUser(6, "ntd6@test.com", "Doanh Nghiep 6", "employer");
        dbContext.Users.AddRange(adminUser, student, employer);

        var conv = new Conversation
        {
            Id = 3,
            UserAId = student.Id,
            UserBId = employer.Id,
            CreatedAt = DateTime.UtcNow
        };
        dbContext.Conversations.Add(conv);
        await dbContext.SaveChangesAsync();

        // Act
        var success = await service.WarnConversationAsync(adminUser.Id, 3, new AdminWarnChatDto
        {
            Message = "[HỆ THỐNG CẢNH BÁO]: Nghi vấn chuyển khoản ngoài sàn."
        });

        // Assert
        Assert.True(success);
        var insertedMsg = await dbContext.ChatMessages.FirstOrDefaultAsync(m => m.ConversationId == 3);
        Assert.NotNull(insertedMsg);
        Assert.Contains("[HỆ THỐNG CẢNH BÁO]", insertedMsg.MessageText);

        var audit = await dbContext.AuditLogs.FirstOrDefaultAsync();
        Assert.NotNull(audit);
        Assert.Contains("Phát cảnh báo", audit.ActionText);
    }

    [Fact]
    public async Task LockConversationAsync_ShouldSetIsReadOnly_AndInsertLockMessage()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new AdminMessageService(dbContext, _loggerMock.Object);

        var adminUser = CreateUser(99, "admin@skillbridge.vn", "Super Admin", "admin");
        var student = CreateUser(7, "sv7@test.com", "Sinh Vien 7", "talent");
        var employer = CreateUser(8, "ntd8@test.com", "Doanh Nghiep 8", "employer");
        dbContext.Users.AddRange(adminUser, student, employer);

        var conv = new Conversation
        {
            Id = 4,
            UserAId = student.Id,
            UserBId = employer.Id,
            CreatedAt = DateTime.UtcNow
        };
        dbContext.Conversations.Add(conv);
        await dbContext.SaveChangesAsync();

        // Act
        var success = await service.LockConversationAsync(adminUser.Id, 4, new AdminLockChatDto
        {
            Reason = "Vi phạm điều khoản dịch vụ nghiêm trọng"
        });

        // Assert
        Assert.True(success);
        var updatedConv = await dbContext.Conversations.FirstAsync(c => c.Id == 4);
        Assert.True(updatedConv.IsReadOnly);
        Assert.Equal("Vi phạm điều khoản dịch vụ nghiêm trọng", updatedConv.ReadOnlyReason);

        var lockMsg = await dbContext.ChatMessages.FirstOrDefaultAsync(m => m.ConversationId == 4);
        Assert.NotNull(lockMsg);
        Assert.Contains("tạm khóa", lockMsg.MessageText);
    }

    [Fact]
    public async Task SendBroadcastAsync_ShouldCreateNotificationsForTargetUsers()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new AdminMessageService(dbContext, _loggerMock.Object);

        var adminUser = CreateUser(99, "admin@skillbridge.vn", "Super Admin", "admin");
        var student = CreateUser(10, "sv10@test.com", "Sinh Vien 10", "talent");
        var employer = CreateUser(11, "ntd11@test.com", "Doanh Nghiep 11", "employer");
        dbContext.Users.AddRange(adminUser, student, employer);
        await dbContext.SaveChangesAsync();

        // Act - Broadcast tới sinh viên
        var count = await service.SendBroadcastAsync(adminUser.Id, new AdminBroadcastDto
        {
            Title = "Cảnh báo bảo mật",
            Content = "Tuyệt đối không nộp tiền cọc trước khi nhận việc",
            TargetRole = "student"
        });

        // Assert
        Assert.Equal(1, count);
        var notif = await dbContext.Notifications.FirstOrDefaultAsync(n => n.UserId == student.Id);
        Assert.NotNull(notif);
        Assert.Contains("Tuyệt đối không nộp tiền cọc", notif.MessageText);

        var employerNotif = await dbContext.Notifications.FirstOrDefaultAsync(n => n.UserId == employer.Id);
        Assert.Null(employerNotif);
    }
}
