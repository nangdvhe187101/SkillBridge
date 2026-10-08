using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Users;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Services.Users;
using Xunit;

namespace SkillBridge.Tests.Admin;

public class AdminUserServiceTests
{
    private readonly Mock<ILogger<AdminUserService>> _loggerMock = new();

    private static SkillBridgeDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<SkillBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new SkillBridgeDbContext(options);
    }

    [Fact]
    public async Task ToggleLockUser_WhenActiveUser_ShouldLockAndIncrementTokenVersion()
    {
        // Arrange
        await using var dbContext = CreateInMemoryDbContext();
        var adminRole = new Role { Id = 7, Code = "admin", Name = "Admin", Type = "admin", IsActive = true };
        var studentRole = new Role { Id = 2, Code = "student", Name = "Sinh viên", Type = "user", IsActive = true };

        var admin = new User
        {
            Id = 10,
            Email = "admin_test@skillbridge.vn",
            FullName = "Admin Test",
            RoleId = adminRole.Id,
            Role = adminRole,
            AccountStatus = "active",
            KycStatus = "verified",
            PasswordHash = "hash",
            TokenVersion = 1
        };

        var targetUser = new User
        {
            Id = 25,
            Email = "student@gmail.com",
            FullName = "Student Test",
            RoleId = studentRole.Id,
            Role = studentRole,
            AccountStatus = "active",
            KycStatus = "verified",
            PasswordHash = "hash",
            TokenVersion = 5
        };

        await dbContext.Roles.AddRangeAsync(adminRole, studentRole);
        await dbContext.Users.AddRangeAsync(admin, targetUser);
        await dbContext.SaveChangesAsync();

        var service = new AdminUserService(dbContext, _loggerMock.Object);

        // Act
        var result = await service.ToggleLockUserAsync(admin.Id, targetUser.Id, new AdminLockUserRequest { Reason = "Nghi vấn gian lận" });

        // Assert
        Assert.Equal("locked", result.Status);
        var updatedInDb = await dbContext.Users.FindAsync(targetUser.Id);
        Assert.NotNull(updatedInDb);
        Assert.Equal("locked", updatedInDb.AccountStatus);
        Assert.Equal(6, updatedInDb.TokenVersion); // TokenVersion++ to revoke JWT immediately

        // Verify Audit Log
        var audit = await dbContext.AuditLogs.FirstOrDefaultAsync();
        Assert.NotNull(audit);
        Assert.Contains("LOCK_USER", audit.ActionText);
        Assert.Contains("Nghi vấn gian lận", audit.ActionText);
    }

    [Fact]
    public async Task ToggleLockUser_WhenLockedUser_ShouldUnlockSuccessfully()
    {
        // Arrange
        await using var dbContext = CreateInMemoryDbContext();
        var adminRole = new Role { Id = 7, Code = "admin", Name = "Admin", Type = "admin", IsActive = true };
        var studentRole = new Role { Id = 2, Code = "student", Name = "Sinh viên", Type = "user", IsActive = true };

        var admin = new User
        {
            Id = 10,
            Email = "admin_test@skillbridge.vn",
            FullName = "Admin Test",
            RoleId = adminRole.Id,
            Role = adminRole,
            AccountStatus = "active",
            KycStatus = "verified",
            PasswordHash = "hash",
            TokenVersion = 1
        };

        var targetUser = new User
        {
            Id = 25,
            Email = "student@gmail.com",
            FullName = "Student Test",
            RoleId = studentRole.Id,
            Role = studentRole,
            AccountStatus = "locked",
            KycStatus = "verified",
            PasswordHash = "hash",
            TokenVersion = 6
        };

        await dbContext.Roles.AddRangeAsync(adminRole, studentRole);
        await dbContext.Users.AddRangeAsync(admin, targetUser);
        await dbContext.SaveChangesAsync();

        var service = new AdminUserService(dbContext, _loggerMock.Object);

        // Act
        var result = await service.ToggleLockUserAsync(admin.Id, targetUser.Id, new AdminLockUserRequest());

        // Assert
        Assert.Equal("active", result.Status);
        var updatedInDb = await dbContext.Users.FindAsync(targetUser.Id);
        Assert.NotNull(updatedInDb);
        Assert.Equal("active", updatedInDb.AccountStatus);

        // Verify Audit Log
        var audit = await dbContext.AuditLogs.FirstOrDefaultAsync();
        Assert.NotNull(audit);
        Assert.Contains("UNLOCK_USER", audit.ActionText);
    }

    [Fact]
    public async Task ToggleLockUser_WhenTargetIsRootAdmin_ShouldThrowBusinessException()
    {
        // Arrange
        await using var dbContext = CreateInMemoryDbContext();
        var adminRole = new Role { Id = 1, Code = "super_admin", Name = "Super Admin", Type = "admin", IsActive = true };
        var modRole = new Role { Id = 7, Code = "admin", Name = "Admin", Type = "admin", IsActive = true };

        var rootAdmin = new User
        {
            Id = 1,
            Email = "admin@skillbridge.vn",
            FullName = "Root Admin",
            RoleId = 1,
            Role = adminRole,
            AccountStatus = "active",
            KycStatus = "verified",
            PasswordHash = "hash"
        };

        var otherAdmin = new User
        {
            Id = 2,
            Email = "moderator@skillbridge.vn",
            FullName = "Mod",
            RoleId = 7,
            Role = modRole,
            AccountStatus = "active",
            KycStatus = "verified",
            PasswordHash = "hash"
        };

        await dbContext.Roles.AddRangeAsync(adminRole, modRole);
        await dbContext.Users.AddRangeAsync(rootAdmin, otherAdmin);
        await dbContext.SaveChangesAsync();

        var service = new AdminUserService(dbContext, _loggerMock.Object);

        // Act & Assert (INV-ADM-06: Root admin cannot be locked)
        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.ToggleLockUserAsync(otherAdmin.Id, rootAdmin.Id, new AdminLockUserRequest()));

        Assert.Contains("Quản trị viên", ex.Message);
    }

    [Fact]
    public async Task ToggleLockUser_WhenAdminLocksThemselves_ShouldThrowBusinessException()
    {
        // Arrange
        await using var dbContext = CreateInMemoryDbContext();
        var adminRole = new Role { Id = 7, Code = "admin", Name = "Admin", Type = "admin", IsActive = true };

        var admin = new User
        {
            Id = 15,
            Email = "admin_self@skillbridge.vn",
            FullName = "Admin Self",
            RoleId = 7,
            Role = adminRole,
            AccountStatus = "active",
            KycStatus = "verified",
            PasswordHash = "hash"
        };

        await dbContext.Roles.AddAsync(adminRole);
        await dbContext.Users.AddAsync(admin);
        await dbContext.SaveChangesAsync();

        var service = new AdminUserService(dbContext, _loggerMock.Object);

        // Act & Assert (Q-010: Cannot lock self)
        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.ToggleLockUserAsync(admin.Id, admin.Id, new AdminLockUserRequest()));

        Assert.Contains("chính mình", ex.Message);
    }
}
