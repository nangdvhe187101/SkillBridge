using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Services.Notifications;
using Xunit;

namespace SkillBridge.Tests.Notifications;

public class NotificationServiceTests
{
    private readonly Mock<ILogger<NotificationService>> _loggerMock = new();

    private SkillBridgeDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<SkillBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new SkillBridgeDbContext(options);
    }

    [Fact]
    public async Task GetUserNotificationsAsync_ShouldReturnOnlyUserNotificationsWithCorrectCounts()
    {
        using var db = CreateInMemoryDbContext();
        var user1Id = 10;
        var user2Id = 20;

        db.Notifications.AddRange(
            new Notification { Id = 1, UserId = user1Id, MessageText = "Notif 1", Icon = "🔔", IsRead = false, CreatedAt = DateTime.UtcNow.AddMinutes(-10) },
            new Notification { Id = 2, UserId = user1Id, MessageText = "Notif 2", Icon = "✅", IsRead = true, CreatedAt = DateTime.UtcNow.AddMinutes(-5) },
            new Notification { Id = 3, UserId = user1Id, MessageText = "Notif 3", Icon = "💰", IsRead = false, CreatedAt = DateTime.UtcNow.AddMinutes(-1) },
            new Notification { Id = 4, UserId = user2Id, MessageText = "Notif User 2", Icon = "🚀", IsRead = false, CreatedAt = DateTime.UtcNow }
        );
        await db.SaveChangesAsync();

        var service = new NotificationService(db, _loggerMock.Object);

        var result = await service.GetUserNotificationsAsync(user1Id, page: 1, pageSize: 10);

        Assert.NotNull(result);
        Assert.Equal(3, result.TotalCount);
        Assert.Equal(2, result.UnreadCount);
        Assert.Equal(3, result.Items.Count);
        Assert.All(result.Items, item => Assert.DoesNotContain("User 2", item.MessageText));
    }

    [Fact]
    public async Task MarkAsReadAsync_WhenValidNotification_ShouldSetIsReadTrue()
    {
        using var db = CreateInMemoryDbContext();
        var userId = 10;
        db.Notifications.Add(new Notification
        {
            Id = 100,
            UserId = userId,
            MessageText = "Job accepted",
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var service = new NotificationService(db, _loggerMock.Object);

        await service.MarkAsReadAsync(userId, 100);

        var updated = await db.Notifications.FindAsync(100);
        Assert.NotNull(updated);
        Assert.True(updated.IsRead);
    }

    [Fact]
    public async Task MarkAsReadAsync_WhenBelongsToDifferentUser_ShouldThrowKeyNotFoundException()
    {
        using var db = CreateInMemoryDbContext();
        db.Notifications.Add(new Notification
        {
            Id = 101,
            UserId = 999,
            MessageText = "Secret notif",
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var service = new NotificationService(db, _loggerMock.Object);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.MarkAsReadAsync(userId: 10, notificationId: 101));
    }

    [Fact]
    public async Task MarkAllAsReadAsync_ShouldOnlyMarkTargetUserNotifications()
    {
        using var db = CreateInMemoryDbContext();
        var user1Id = 10;
        var user2Id = 20;

        db.Notifications.AddRange(
            new Notification { Id = 1, UserId = user1Id, MessageText = "Notif 1", IsRead = false, CreatedAt = DateTime.UtcNow },
            new Notification { Id = 2, UserId = user1Id, MessageText = "Notif 2", IsRead = false, CreatedAt = DateTime.UtcNow },
            new Notification { Id = 3, UserId = user1Id, MessageText = "Notif 3", IsRead = true, CreatedAt = DateTime.UtcNow },
            new Notification { Id = 4, UserId = user2Id, MessageText = "Notif User 2", IsRead = false, CreatedAt = DateTime.UtcNow }
        );
        await db.SaveChangesAsync();

        var service = new NotificationService(db, _loggerMock.Object);

        await service.MarkAllAsReadAsync(user1Id);

        var user1Unread = await db.Notifications.CountAsync(n => n.UserId == user1Id && !n.IsRead);
        Assert.Equal(0, user1Unread);

        var user2Unread = await db.Notifications.CountAsync(n => n.UserId == user2Id && !n.IsRead);
        Assert.Equal(1, user2Unread);
    }

    [Fact]
    public async Task SendAsync_ShouldPersistNotificationToDatabase()
    {
        using var db = CreateInMemoryDbContext();
        var service = new NotificationService(db, _loggerMock.Object);

        await service.SendAsync(
            userId: 50,
            icon: "🎉",
            message: "Bạn đã nhận được thanh toán 500.000đ",
            link: "/wallet"
        );

        var saved = await db.Notifications.FirstOrDefaultAsync(n => n.UserId == 50);
        Assert.NotNull(saved);
        Assert.Equal("🎉", saved.Icon);
        Assert.Equal("Bạn đã nhận được thanh toán 500.000đ", saved.MessageText);
        Assert.Equal("/wallet", saved.Link);
        Assert.False(saved.IsRead);
    }
}
