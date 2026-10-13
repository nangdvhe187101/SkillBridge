using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Admin;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Services.Admin;
using Microsoft.Extensions.Logging;

namespace SkillBridge.Tests.Admin;

/// <summary>
/// BUG-FIX-1: Tests for AdminTeamMember email validation
/// Prevents privilege escalation by rejecting duplicate emails when creating admin team members
/// </summary>
public class AdminTeamMemberEmailValidationTests
{
    private SkillBridgeDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<SkillBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new SkillBridgeDbContext(options);
    }

    private async Task SeedRolesAsync(SkillBridgeDbContext dbContext)
    {
        var roles = new[]
        {
            new Role { Id = 1, Code = "business_admin", Name = "Business Admin", Type = "admin", Description = "Business Admin", IsActive = true, CreatedAt = DateTime.UtcNow },
            new Role { Id = 2, Code = "moderator", Name = "Moderator", Type = "admin", Description = "Moderator", IsActive = true, CreatedAt = DateTime.UtcNow },
            new Role { Id = 3, Code = "student", Name = "Student", Type = "user", Description = "Student", IsActive = true, CreatedAt = DateTime.UtcNow }
        };

        dbContext.Roles.AddRange(roles);
        await dbContext.SaveChangesAsync();
    }

    /// <summary>
    /// BUG-FIX-1: Test that duplicate email in AdminTeamMembers table is rejected
    /// </summary>
    [Fact]
    public async Task AddTeamMember_WithDuplicateEmail_ShouldThrowBusinessException()
    {
        // Arrange
        var dbContext = CreateDbContext();
        await SeedRolesAsync(dbContext);
        var logger = new Mock<ILogger<AdminRoleService>>().Object;
        var service = new AdminRoleService(dbContext, logger);

        var firstMember = new AdminTeamMember
        {
            Name = "Admin One",
            Email = "admin1@test.com",
            RoleId = 1,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        dbContext.AdminTeamMembers.Add(firstMember);
        await dbContext.SaveChangesAsync();

        // Act & Assert
        var dto = new CreateAdminTeamMemberDto
        {
            Name = "Admin Two",
            Email = "admin1@test.com",
            Password = "SecurePass123!@#",
            RoleId = 1
        };

        var ex = await Assert.ThrowsAsync<BusinessException>(async () =>
            await service.AddTeamMemberAsync(dto, 1, CancellationToken.None)
        );

        Assert.Contains("đã tồn tại", ex.Message);
    }

    /// <summary>
    /// BUG-FIX-1: Test that duplicate email is case-insensitive
    /// </summary>
    [Fact]
    public async Task AddTeamMember_WithDuplicateEmailCaseInsensitive_ShouldThrowBusinessException()
    {
        // Arrange
        var dbContext = CreateDbContext();
        await SeedRolesAsync(dbContext);
        var logger = new Mock<ILogger<AdminRoleService>>().Object;
        var service = new AdminRoleService(dbContext, logger);

        var firstMember = new AdminTeamMember
        {
            Name = "Admin One",
            Email = "admin1@test.com",
            RoleId = 1,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        dbContext.AdminTeamMembers.Add(firstMember);
        await dbContext.SaveChangesAsync();

        // Act & Assert
        var dto = new CreateAdminTeamMemberDto
        {
            Name = "Admin Two",
            Email = "ADMIN1@TEST.COM",
            Password = "SecurePass123!@#",
            RoleId = 1
        };

        var ex = await Assert.ThrowsAsync<BusinessException>(async () =>
            await service.AddTeamMemberAsync(dto, 1, CancellationToken.None)
        );

        Assert.Contains("đã tồn tại", ex.Message);
    }

    /// <summary>
    /// BUG-FIX-1: Test that invalid email format is rejected
    /// </summary>
    [Fact]
    public async Task AddTeamMember_WithInvalidEmailFormat_ShouldThrowBusinessException()
    {
        // Arrange
        var dbContext = CreateDbContext();
        await SeedRolesAsync(dbContext);
        var logger = new Mock<ILogger<AdminRoleService>>().Object;
        var service = new AdminRoleService(dbContext, logger);

        // Act & Assert
        var dto = new CreateAdminTeamMemberDto
        {
            Name = "Admin One",
            Email = "not-an-email",
            Password = "SecurePass123!@#",
            RoleId = 1
        };

        var ex = await Assert.ThrowsAsync<BusinessException>(async () =>
            await service.AddTeamMemberAsync(dto, 1, CancellationToken.None)
        );

        Assert.Contains("không hợp lệ", ex.Message);
    }

    /// <summary>
    /// BUG-FIX-1: Test that valid new email is accepted
    /// </summary>
    [Fact]
    public async Task AddTeamMember_WithValidNewEmail_ShouldSucceed()
    {
        // Arrange
        var dbContext = CreateDbContext();
        await SeedRolesAsync(dbContext);
        var logger = new Mock<ILogger<AdminRoleService>>().Object;
        var service = new AdminRoleService(dbContext, logger);

        // Act
        var dto = new CreateAdminTeamMemberDto
        {
            Name = "New Admin",
            Email = "newadmin@test.com",
            Password = "SecurePass123!@#",
            RoleId = 1
        };

        var result = await service.AddTeamMemberAsync(dto, 1, CancellationToken.None);

        // Assert
        Assert.True(result.Id > 0);
        Assert.Equal("newadmin@test.com", result.Email);
        Assert.Equal("New Admin", result.Name);

        var saved = await dbContext.AdminTeamMembers.FirstOrDefaultAsync(m => m.Email == "newadmin@test.com");
        Assert.NotNull(saved);
    }

    /// <summary>
    /// BUG-FIX-1: Test that strong password validation is enforced
    /// </summary>
    [Fact]
    public async Task AddTeamMember_WithWeakPassword_ShouldThrowBusinessException()
    {
        // Arrange
        var dbContext = CreateDbContext();
        await SeedRolesAsync(dbContext);
        var logger = new Mock<ILogger<AdminRoleService>>().Object;
        var service = new AdminRoleService(dbContext, logger);

        // Act & Assert
        var dto = new CreateAdminTeamMemberDto
        {
            Name = "Admin One",
            Email = "admin1@test.com",
            Password = "weak",
            RoleId = 1
        };

        var ex = await Assert.ThrowsAsync<BusinessException>(async () =>
            await service.AddTeamMemberAsync(dto, 1, CancellationToken.None)
        );

        Assert.Contains("Mật khẩu", ex.Message);
    }

    /// <summary>
    /// BUG-FIX-1: Test that both AdminTeamMember and User records are created in transaction
    /// </summary>
    [Fact]
    public async Task AddTeamMember_CreatesUserRecordInTransaction()
    {
        // Arrange
        var dbContext = CreateDbContext();
        await SeedRolesAsync(dbContext);
        var logger = new Mock<ILogger<AdminRoleService>>().Object;
        var service = new AdminRoleService(dbContext, logger);

        // Act
        var dto = new CreateAdminTeamMemberDto
        {
            Name = "Admin User",
            Email = "admin@transaction.com",
            Password = "SecurePass123!@#",
            RoleId = 1
        };

        var result = await service.AddTeamMemberAsync(dto, 1, CancellationToken.None);

        // Assert: Check both records exist
        var adminMember = await dbContext.AdminTeamMembers
            .FirstOrDefaultAsync(m => m.Email == "admin@transaction.com");
        var user = await dbContext.Users
            .FirstOrDefaultAsync(u => u.Email == "admin@transaction.com");

        Assert.NotNull(adminMember);
        Assert.NotNull(user);
        Assert.Equal("Admin User", user?.FullName);
    }

    /// <summary>
    /// Email đã thuộc về một user (sinh viên/nhà tuyển dụng) phải bị từ chối,
    /// và tài khoản user đó phải giữ nguyên role, mật khẩu, tên.
    /// </summary>
    [Fact]
    public async Task AddTeamMember_WithEmailOfExistingUser_ShouldRejectAndKeepUserIntact()
    {
        var dbContext = CreateDbContext();
        await SeedRolesAsync(dbContext);
        var existing = new User
        {
            FullName = "Student One",
            Email = "student@test.com",
            PasswordHash = "original-hash",
            RoleId = 3,
            AccountStatus = "active",
            KycStatus = "pending",
            JoinedAt = DateTime.UtcNow
        };
        dbContext.Users.Add(existing);
        await dbContext.SaveChangesAsync();

        var service = new AdminRoleService(dbContext, new Mock<ILogger<AdminRoleService>>().Object);
        var dto = new CreateAdminTeamMemberDto
        {
            Name = "Hijacker",
            Email = "Student@Test.com",
            Password = "SecurePass123!@#",
            RoleId = 1
        };

        await Assert.ThrowsAsync<BusinessException>(() => service.AddTeamMemberAsync(dto, 1, CancellationToken.None));

        var user = await dbContext.Users.AsNoTracking().SingleAsync(u => u.Email == "student@test.com");
        Assert.Equal(3, user.RoleId);
        Assert.Equal("original-hash", user.PasswordHash);
        Assert.Equal("Student One", user.FullName);
        Assert.False(await dbContext.AdminTeamMembers.AnyAsync(m => m.Email == "student@test.com"));
    }
}
