using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Support;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Services.Support;
using Xunit;

namespace SkillBridge.Tests.Support;

public class SupportTicketCreationTests
{
    private static SkillBridgeDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<SkillBridgeDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new SkillBridgeDbContext(options);
    }

    [Fact]
    public async Task CreateTicketAsync_WithAuthenticatedUser_CreatesTicketWithUserId()
    {
        // Arrange
        using var db = CreateDbContext();
        var user = new User
        {
            Id = 15,
            FullName = "Nguyễn Văn A",
            Email = "nguyenvana@gmail.com",
            PasswordHash = "hash",
            AccountStatus = "active",
            KycStatus = "verified",
            JoinedAt = DateTime.UtcNow
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var logger = new Mock<ILogger<SupportTicketService>>().Object;
        var service = new SupportTicketService(db, logger);

        var dto = new CreateSupportTicketDto
        {
            Name = "Nguyễn Văn A",
            Email = "nguyenvana@gmail.com",
            Phone = "0987654321",
            Subject = "Hỗ trợ nạp tiền ví",
            Message = "Tôi vừa chuyển khoản nhưng số dư chưa cộng vào ví."
        };

        // Act
        var result = await service.CreateTicketAsync(dto, authenticatedUserId: 15);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.TicketId > 0);
        Assert.Equal("open", result.Status);

        var savedTicket = await db.SupportTickets.FirstOrDefaultAsync(t => t.Id == result.TicketId);
        Assert.NotNull(savedTicket);
        Assert.Equal(15, savedTicket.UserId);
        Assert.Equal("Hỗ trợ nạp tiền ví", savedTicket.Subject);
        Assert.Contains("0987654321", savedTicket.Description);
        Assert.Contains("Tôi vừa chuyển khoản", savedTicket.Description);
    }

    [Fact]
    public async Task CreateTicketAsync_WithGuestMatchingExistingEmail_LinksToExistingUserId()
    {
        // Arrange
        using var db = CreateDbContext();
        var existingUser = new User
        {
            Id = 42,
            FullName = "Trần Thị B",
            Email = "tranthib@fpt.edu.vn",
            PasswordHash = "hash",
            AccountStatus = "active",
            KycStatus = "verified",
            JoinedAt = DateTime.UtcNow
        };
        db.Users.Add(existingUser);
        await db.SaveChangesAsync();

        var logger = new Mock<ILogger<SupportTicketService>>().Object;
        var service = new SupportTicketService(db, logger);

        var dto = new CreateSupportTicketDto
        {
            Name = "Trần Thị B",
            Email = "tranthib@fpt.edu.vn",
            Subject = "Không thể ứng tuyển công việc",
            Message = "Nút nộp CV bị mờ không bấm được."
        };

        // Act (khách vãng lai gửi nhưng email trùng tài khoản đã có)
        var result = await service.CreateTicketAsync(dto, authenticatedUserId: null);

        // Assert
        Assert.NotNull(result);
        var savedTicket = await db.SupportTickets.FirstOrDefaultAsync(t => t.Id == result.TicketId);
        Assert.NotNull(savedTicket);
        Assert.Equal(42, savedTicket.UserId);
    }

    [Fact]
    public async Task CreateTicketAsync_WithUnregisteredGuestEmail_FallsBackToExistingSystemUser()
    {
        // Arrange
        using var db = CreateDbContext();
        var systemUser = new User
        {
            Id = 1,
            FullName = "SkillBridge System",
            Email = "admin@skillbridge.vn",
            PasswordHash = "hash",
            AccountStatus = "active",
            KycStatus = "verified",
            JoinedAt = DateTime.UtcNow
        };
        db.Users.Add(systemUser);
        await db.SaveChangesAsync();

        var logger = new Mock<ILogger<SupportTicketService>>().Object;
        var service = new SupportTicketService(db, logger);

        var dto = new CreateSupportTicketDto
        {
            Name = "Khách Hàng Mới",
            Email = "newvisitor@gmail.com",
            Phone = "0912345678",
            Subject = "Tư vấn doanh nghiệp",
            Message = "Chúng tôi muốn tuyển dụng 50 sinh viên part-time."
        };

        // Act
        var result = await service.CreateTicketAsync(dto, authenticatedUserId: null);

        // Assert
        Assert.NotNull(result);
        var savedTicket = await db.SupportTickets.FirstOrDefaultAsync(t => t.Id == result.TicketId);
        Assert.NotNull(savedTicket);
        Assert.Equal(1, savedTicket.UserId);
        Assert.Contains("newvisitor@gmail.com", savedTicket.Description);
        Assert.Contains("Khách Hàng Mới", savedTicket.Description);
    }

    [Fact]
    public async Task CreateTicketAsync_WithHoneypotTrapFilled_SilentlyDiscardsWithoutSavingToDb()
    {
        // Arrange
        using var db = CreateDbContext();
        var systemUser = new User
        {
            Id = 1,
            FullName = "SkillBridge System",
            Email = "admin@skillbridge.vn",
            PasswordHash = "hash",
            AccountStatus = "active",
            KycStatus = "verified",
            JoinedAt = DateTime.UtcNow
        };
        db.Users.Add(systemUser);
        await db.SaveChangesAsync();

        var logger = new Mock<ILogger<SupportTicketService>>().Object;
        var service = new SupportTicketService(db, logger);

        var spamBotDto = new CreateSupportTicketDto
        {
            Name = "Spam Bot",
            Email = "spambot@auto-blast.com",
            Phone = "0123456789",
            Subject = "Buy Cheap Crypto Now",
            Message = "Click here to win 1 BTC instantly: http://spam-scam.xyz",
            HoneypotTrap = "filled-by-crawler-bot" // Bot điền trường bẫy ẩn
        };

        // Act
        var result = await service.CreateTicketAsync(spamBotDto, authenticatedUserId: null);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(0, result.TicketId); // Silently discarded
        Assert.Equal("open", result.Status);

        // Đảm bảo không có record nào lưu vào DB
        var count = await db.SupportTickets.CountAsync();
        Assert.Equal(0, count);
    }

    [Fact]
    public async Task CreateTicketAsync_WithDuplicateContentWithin5Minutes_ThrowsBusinessException()
    {
        // Arrange
        using var db = CreateDbContext();
        var user = new User
        {
            Id = 2,
            FullName = "Người dùng Thử nghiệm",
            Email = "tester@skillbridge.vn",
            PasswordHash = "hash",
            AccountStatus = "active",
            KycStatus = "verified",
            JoinedAt = DateTime.UtcNow
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var logger = new Mock<ILogger<SupportTicketService>>().Object;
        var service = new SupportTicketService(db, logger);

        var dto = new CreateSupportTicketDto
        {
            Name = "Người dùng Thử nghiệm",
            Email = "tester@skillbridge.vn",
            Subject = "Lỗi nạp tiền qua cổng VNPay",
            Message = "Tôi bị trừ tiền trong tài khoản ngân hàng nhưng ví web chưa tăng."
        };

        // Lần gửi 1: Thành công
        var firstResult = await service.CreateTicketAsync(dto, authenticatedUserId: 2);
        Assert.True(firstResult.TicketId > 0);

        // Lần gửi 2 (Spam lặp lại ngay trong vòng 5 phút): Phải bị chặn và ném BusinessException
        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.CreateTicketAsync(dto, authenticatedUserId: 2));

        Assert.Contains("Yêu cầu này của bạn đã được hệ thống tiếp nhận cách đây ít phút", ex.Message);
    }
}
