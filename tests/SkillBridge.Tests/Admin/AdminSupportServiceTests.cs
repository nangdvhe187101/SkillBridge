using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Admin;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Services.Admin;
using Xunit;

namespace SkillBridge.Tests.Admin;

public class AdminSupportServiceTests
{
    private readonly Mock<ILogger<AdminSupportService>> _loggerMock = new();

    private SkillBridgeDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<SkillBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new SkillBridgeDbContext(options);
    }

    private static User CreateUser(int id, string email, string name)
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
                Code = "talent",
                Name = "talent",
                Type = "talent",
                IsActive = true
            }
        };
    }

    [Fact]
    public async Task GetTicketsAsync_ShouldFilterByStatusAndSearch()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new AdminSupportService(dbContext, _loggerMock.Object);

        var user1 = CreateUser(1, "nguyenvana@gmail.com", "Nguyễn Văn A");
        var user2 = CreateUser(2, "tranthib@gmail.com", "Trần Thị B");
        dbContext.Users.AddRange(user1, user2);

        var ticket1 = new SupportTicket
        {
            Id = 1,
            UserId = 1,
            Subject = "Hỏi về cách rút tiền gấp",
            Description = "Tôi nộp đơn rút tiền mà chưa thấy duyệt",
            Status = "open",
            CreatedAt = DateTime.UtcNow.AddHours(-2)
        };

        var ticket2 = new SupportTicket
        {
            Id = 2,
            UserId = 2,
            Subject = "Góp ý giao diện",
            Description = "Giao diện rất đẹp",
            Status = "resolved",
            CreatedAt = DateTime.UtcNow.AddDays(-1)
        };

        dbContext.SupportTickets.AddRange(ticket1, ticket2);
        await dbContext.SaveChangesAsync();

        // Act - Lọc ticket open
        var openResult = await service.GetTicketsAsync(null, "open", 1, 20);
        // Act - Tìm kiếm theo email user
        var searchResult = await service.GetTicketsAsync("nguyenvana", "all", 1, 20);

        // Assert
        Assert.Single(openResult.Items);
        Assert.Equal(1, openResult.Items[0].Id);
        Assert.Equal("high", openResult.Items[0].Priority); // Chứa chữ "gấp" -> high

        Assert.Single(searchResult.Items);
        Assert.Equal("Nguyễn Văn A", searchResult.Items[0].UserName);
        Assert.Equal(1, openResult.OpenCount);
        Assert.Equal(1, openResult.ResolvedCount);
    }

    [Fact]
    public async Task ReplyAndResolveTicketAsync_WhenClose_ShouldSetStatusResolvedAndRecordAuditLog()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new AdminSupportService(dbContext, _loggerMock.Object);

        var user = CreateUser(10, "user10@gmail.com", "Lê Văn C");
        var admin = CreateUser(99, "admin@skillbridge.vn", "Admin Root");
        dbContext.Users.AddRange(user, admin);

        var ticket = new SupportTicket
        {
            Id = 100,
            UserId = 10,
            Subject = "Khiếu nại chưa nhận được tiền thưởng",
            Description = "Tôi hoàn thành job mà ví chưa nhận tiền",
            Status = "open",
            CreatedAt = DateTime.UtcNow.AddHours(-1)
        };
        dbContext.SupportTickets.Add(ticket);
        await dbContext.SaveChangesAsync();

        var dto = new AdminResolveTicketDto
        {
            ReplyMessage = "Đã kiểm tra và cộng tiền vào ví của bạn thành công.",
            CloseTicket = true
        };

        // Act
        var result = await service.ReplyAndResolveTicketAsync(100, 99, dto);

        // Assert
        Assert.Equal("resolved", result.Status);
        Assert.NotNull(result.ResolvedAt);

        // Kiểm tra Notification đã được tạo cho User
        var notification = await dbContext.Notifications.FirstOrDefaultAsync(n => n.UserId == 10);
        Assert.NotNull(notification);
        Assert.Contains("Đã kiểm tra và cộng tiền", notification.MessageText);

        // Kiểm tra AuditLog đã được ghi nhận
        var auditLogs = await dbContext.AuditLogs.ToListAsync();
        Assert.NotEmpty(auditLogs);
        Assert.Contains(auditLogs, a => a.ActionText.Contains("đã giải quyết và đóng ticket hỗ trợ #100"));
    }

    [Fact]
    public async Task ReplyAndResolveTicketAsync_WhenReplyOnly_ShouldSendNotificationAndKeepOpen()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new AdminSupportService(dbContext, _loggerMock.Object);

        var user = CreateUser(20, "user20@gmail.com", "Phạm Văn D");
        var admin = CreateUser(99, "admin@skillbridge.vn", "Admin Root");
        dbContext.Users.AddRange(user, admin);

        var ticket = new SupportTicket
        {
            Id = 200,
            UserId = 20,
            Subject = "Hỏi về chứng chỉ kỹ năng",
            Description = "Làm sao để nhận huy hiệu?",
            Status = "open",
            CreatedAt = DateTime.UtcNow
        };
        dbContext.SupportTickets.Add(ticket);
        await dbContext.SaveChangesAsync();

        var dto = new AdminResolveTicketDto
        {
            ReplyMessage = "Bạn cần hoàn thành ít nhất 3 dự án để mở bài test huy hiệu.",
            CloseTicket = false
        };

        // Act
        var result = await service.ReplyAndResolveTicketAsync(200, 99, dto);

        // Assert
        Assert.Equal("open", result.Status);
        Assert.Null(result.ResolvedAt);

        var notification = await dbContext.Notifications.FirstOrDefaultAsync(n => n.UserId == 20);
        Assert.NotNull(notification);
        Assert.Contains("hoàn thành ít nhất 3 dự án", notification.MessageText);
    }

    [Fact]
    public async Task ReplyAndResolveTicketAsync_WhenTicketNotFound_ShouldThrowBusinessException()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new AdminSupportService(dbContext, _loggerMock.Object);

        var dto = new AdminResolveTicketDto { ReplyMessage = "Test", CloseTicket = false };

        // Act & Assert
        await Assert.ThrowsAsync<BusinessException>(() => service.ReplyAndResolveTicketAsync(9999, 1, dto));
    }

    [Fact]
    public async Task GetAuditLogsAsync_ShouldFilterBySearchTerm_AndOrderDescending()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new AdminSupportService(dbContext, _loggerMock.Object);

        var adminMember = new AdminTeamMember
        {
            Id = 1,
            Name = "Master Admin",
            Email = "master@skillbridge.vn",
            RoleId = 1,
            IsActive = true,
            CreatedAt = DateTime.UtcNow.AddMonths(-1)
        };
        dbContext.AdminTeamMembers.Add(adminMember);

        var log1 = new AuditLog
        {
            Id = 1,
            ActorId = 1,
            ActionText = "Admin phê duyệt KYC cho sinh viên #12",
            CreatedAt = DateTime.UtcNow.AddHours(-5)
        };

        var log2 = new AuditLog
        {
            Id = 2,
            ActorId = 1,
            ActionText = "Admin khóa tài khoản gian lận #45",
            CreatedAt = DateTime.UtcNow.AddHours(-1)
        };

        dbContext.AuditLogs.AddRange(log1, log2);
        await dbContext.SaveChangesAsync();

        // Act
        var allResult = await service.GetAuditLogsAsync(null, null, null, null, 1, 10);
        var searchResult = await service.GetAuditLogsAsync("KYC", null, null, null, 1, 10);

        // Assert
        Assert.Equal(2, allResult.TotalCount);
        Assert.Equal(2, allResult.Items[0].Id); // Giảm dần theo CreatedAt -> log2 lên đầu
        Assert.Single(searchResult.Items);
        Assert.Contains("KYC", searchResult.Items[0].ActionText);
    }

    [Fact]
    public async Task GetTicketDetailAsync_WhenNotFound_ShouldReturnNull()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new AdminSupportService(dbContext, _loggerMock.Object);

        // Act
        var result = await service.GetTicketDetailAsync(8888);

        // Assert
        Assert.Null(result);
    }
}
