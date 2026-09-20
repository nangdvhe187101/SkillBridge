using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Chat;
using SkillBridge.Application.Interfaces.Chat;
using SkillBridge.Application.Interfaces.Storage;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Services.Chat;
using Xunit;

namespace SkillBridge.Tests.Chat;

public class ChatPresenceAndReportTests
{
    private SkillBridgeDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<SkillBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new SkillBridgeDbContext(options);
    }

    [Fact]
    public void UserPresenceService_AddAndRemoveConnection_ShouldManageOnlineStatusAccurately()
    {
        var presence = new UserPresenceService();

        Assert.False(presence.IsUserOnline(1));
        Assert.Empty(presence.GetOnlineUserIds());

        // Thêm kết nối 1 cho user 1
        var becameOnline1 = presence.AddConnection(1, "conn-1");
        Assert.True(becameOnline1);
        Assert.True(presence.IsUserOnline(1));
        Assert.Contains(1, presence.GetOnlineUserIds());

        // Thêm kết nối 2 cho user 1 (không đổi trạng thái online mới)
        var becameOnline2 = presence.AddConnection(1, "conn-2");
        Assert.False(becameOnline2);
        Assert.True(presence.IsUserOnline(1));

        // Thêm kết nối cho user 2
        presence.AddConnection(2, "conn-3");
        Assert.True(presence.IsUserOnline(2));
        Assert.Equal(2, presence.GetOnlineUserIds().Count);

        // Ngắt kết nối 1 của user 1 -> vẫn online do còn conn-2
        var becameOffline1 = presence.RemoveConnection(1, "conn-1");
        Assert.False(becameOffline1);
        Assert.True(presence.IsUserOnline(1));

        // Ngắt kết nối 2 của user 1 -> chuyển offline
        var becameOffline2 = presence.RemoveConnection(1, "conn-2");
        Assert.True(becameOffline2);
        Assert.False(presence.IsUserOnline(1));
        Assert.DoesNotContain(1, presence.GetOnlineUserIds());
    }

    [Fact]
    public async Task UserPresenceService_MultiThreadedConnections_ShouldBeThreadSafe()
    {
        var presence = new UserPresenceService();
        var tasks = new List<Task>();

        for (int i = 0; i < 50; i++)
        {
            var userId = i % 10;
            var connId = $"conn-{i}";
            tasks.Add(Task.Run(() =>
            {
                presence.AddConnection(userId, connId);
                _ = presence.IsUserOnline(userId);
                _ = presence.GetOnlineUserIds();
            }));
        }

        await Task.WhenAll(tasks);

        var online = presence.GetOnlineUserIds();
        Assert.True(online.Count <= 10);
    }

    [Fact]
    public async Task ReportConversationAsync_ValidReport_ShouldCreatePendingReport()
    {
        using var db = CreateInMemoryDbContext();
        var loggerMock = new Mock<ILogger<ChatService>>();
        var realtimeMock = new Mock<IChatRealtimeNotifier>();
        var storageMock = new Mock<IStorageService>();
        var presenceMock = new Mock<IUserPresenceService>();

        var userA = new User { Id = 101, FullName = "User A", Email = "a@test.com", PasswordHash = "x", RoleId = 1, AccountStatus = "active", KycStatus = "verified" };
        var userB = new User { Id = 102, FullName = "User B", Email = "b@test.com", PasswordHash = "x", RoleId = 2, AccountStatus = "active", KycStatus = "verified" };
        db.Users.AddRange(userA, userB);

        var conv = new Conversation
        {
            Id = 55,
            UserAId = 101,
            UserBId = 102,
            RequestStatus = "active",
            CreatedAt = DateTime.UtcNow
        };
        db.Conversations.Add(conv);
        await db.SaveChangesAsync();

        var chatService = new ChatService(db, realtimeMock.Object, storageMock.Object, presenceMock.Object, loggerMock.Object);

        var req = new ReportConversationRequestDto
        {
            Reason = "Spam / Quảng cáo trái phép",
            Description = "Người này liên tục gửi link spam"
        };

        await chatService.ReportConversationAsync(101, 55, req);

        var report = await db.Reports.FirstOrDefaultAsync(r => r.ReporterId == 101 && r.TargetUserId == 102);
        Assert.NotNull(report);
        Assert.Equal("Spam / Quảng cáo trái phép", report.Reason);
        Assert.Equal("Người này liên tục gửi link spam", report.Description);
        Assert.Equal("pending", report.Status);
    }

    [Fact]
    public async Task ReportConversationAsync_NonParticipant_ShouldThrowUnauthorizedAccessException()
    {
        using var db = CreateInMemoryDbContext();
        var loggerMock = new Mock<ILogger<ChatService>>();
        var realtimeMock = new Mock<IChatRealtimeNotifier>();
        var storageMock = new Mock<IStorageService>();
        var presenceMock = new Mock<IUserPresenceService>();

        var conv = new Conversation
        {
            Id = 56,
            UserAId = 101,
            UserBId = 102,
            RequestStatus = "active",
            CreatedAt = DateTime.UtcNow
        };
        db.Conversations.Add(conv);
        await db.SaveChangesAsync();

        var chatService = new ChatService(db, realtimeMock.Object, storageMock.Object, presenceMock.Object, loggerMock.Object);

        var req = new ReportConversationRequestDto
        {
            Reason = "Quấy rối",
        };

        // User 999 không thuộc hội thoại 56
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            chatService.ReportConversationAsync(999, 56, req));
    }
}
