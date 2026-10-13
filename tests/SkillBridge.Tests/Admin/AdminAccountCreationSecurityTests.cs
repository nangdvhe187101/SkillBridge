using System;
using System.Linq;
using System.Threading;
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

/// <summary>
/// Security tests for admin account creation (FIX-1, FIX-2, FIX-3)
/// Tests email validation, password policy, and transaction isolation
/// </summary>
public class AdminAccountCreationSecurityTests
{
    private readonly Mock<ILogger<AdminRoleService>> _loggerMock = new();

    private static SkillBridgeDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<SkillBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .ConfigureWarnings(w =>
            {
                w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning);
                w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.CoreEventId.ManyServiceProvidersCreatedWarning);
            })
            .Options;

        var context = new SkillBridgeDbContext(options);
        return context;
    }

    private static async Task SeedRolesAsync(SkillBridgeDbContext dbContext)
    {
        var roles = new List<Role>
        {
            new() { Id = 1, Code = "super_admin", Name = "Super Admin", Type = "admin", IsActive = true, CreatedAt = DateTime.UtcNow },
            new() { Id = 2, Code = "business_admin", Name = "Business Admin", Type = "admin", IsActive = true, CreatedAt = DateTime.UtcNow }
        };
        await dbContext.Roles.AddRangeAsync(roles);
        await dbContext.SaveChangesAsync();
    }

    #region FIX-1: Email Validation Tests

    [Fact]
    public async Task AddTeamMember_WithValidEmail_ShouldSucceed()
    {
        // Arrange
        await using var dbContext = CreateInMemoryDbContext();
        await SeedRolesAsync(dbContext);

        var service = new AdminRoleService(dbContext, _loggerMock.Object);
        var request = new CreateAdminTeamMemberDto
        {
            Name = "Valid Admin",
            Email = "valid.admin@skillbridge.vn",
            Password = "SecureP@ss123",
            RoleId = 2
        };

        // Act
        var result = await service.AddTeamMemberAsync(request, 1);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("valid.admin@skillbridge.vn", result.Email);
        var createdMember = await dbContext.AdminTeamMembers.FirstOrDefaultAsync(m => m.Email == "valid.admin@skillbridge.vn");
        Assert.NotNull(createdMember);
    }

    [Fact]
    public async Task AddTeamMember_WithInvalidEmailFormat_ShouldThrowException()
    {
        // Arrange
        await using var dbContext = CreateInMemoryDbContext();
        await SeedRolesAsync(dbContext);

        var service = new AdminRoleService(dbContext, _loggerMock.Object);
        var request = new CreateAdminTeamMemberDto
        {
            Name = "Invalid Email Admin",
            Email = "@invalid.com",
            RoleId = 2
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.AddTeamMemberAsync(request, 1));

        Assert.Contains("Email không hợp lệ", ex.Message);
    }

    [Fact]
    public async Task AddTeamMember_WithMissingAtSymbol_ShouldThrowException()
    {
        // Arrange
        await using var dbContext = CreateInMemoryDbContext();
        await SeedRolesAsync(dbContext);

        var service = new AdminRoleService(dbContext, _loggerMock.Object);
        var request = new CreateAdminTeamMemberDto
        {
            Name = "Missing At Symbol",
            Email = "invalidemail.com",
            RoleId = 2
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.AddTeamMemberAsync(request, 1));

        Assert.Contains("Email không hợp lệ", ex.Message);
    }

    [Fact]
    public async Task AddTeamMember_WithMissingDomain_ShouldThrowException()
    {
        // Arrange
        await using var dbContext = CreateInMemoryDbContext();
        await SeedRolesAsync(dbContext);

        var service = new AdminRoleService(dbContext, _loggerMock.Object);
        var request = new CreateAdminTeamMemberDto
        {
            Name = "Missing Domain",
            Email = "user@",
            RoleId = 2
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.AddTeamMemberAsync(request, 1));

        Assert.Contains("Email không hợp lệ", ex.Message);
    }

    [Fact]
    public async Task AddTeamMember_WithWhitespaceEmail_ShouldThrowException()
    {
        // Arrange
        await using var dbContext = CreateInMemoryDbContext();
        await SeedRolesAsync(dbContext);

        var service = new AdminRoleService(dbContext, _loggerMock.Object);
        var request = new CreateAdminTeamMemberDto
        {
            Name = "Whitespace Email",
            Email = "   ",
            RoleId = 2
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.AddTeamMemberAsync(request, 1));

        Assert.Contains("Email không được để trống", ex.Message);
    }

    #endregion

    #region FIX-2: Strong Password Generation & Validation Tests

    [Fact]
    public async Task AddTeamMember_WithoutProvidedPassword_ShouldGenerateStrongPassword()
    {
        // Arrange
        await using var dbContext = CreateInMemoryDbContext();
        await SeedRolesAsync(dbContext);

        var service = new AdminRoleService(dbContext, _loggerMock.Object);
        var request = new CreateAdminTeamMemberDto
        {
            Name = "Auto Password Admin",
            Email = "auto.password@skillbridge.vn",
            RoleId = 2
            // Password is null - should auto-generate
        };

        // Act
        var result = await service.AddTeamMemberAsync(request, 1);

        // Assert
        Assert.NotNull(result);
        var createdUser = await dbContext.Users.FirstOrDefaultAsync(u => u.Email == "auto.password@skillbridge.vn");
        Assert.NotNull(createdUser);
        Assert.NotNull(createdUser.PasswordHash);
        // Password hash should be present (BCrypt hashed)
        Assert.StartsWith("$2a$", createdUser.PasswordHash); // BCrypt hash format
    }

    [Fact]
    public async Task AddTeamMember_WithTooShortPassword_ShouldThrowException()
    {
        // Arrange
        await using var dbContext = CreateInMemoryDbContext();
        await SeedRolesAsync(dbContext);

        var service = new AdminRoleService(dbContext, _loggerMock.Object);
        var request = new CreateAdminTeamMemberDto
        {
            Name = "Short Password Admin",
            Email = "short.pass@skillbridge.vn",
            Password = "Pass1!",  // Only 6 chars - less than 12 minimum
            RoleId = 2
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.AddTeamMemberAsync(request, 1));

        Assert.Contains("12 ký tự", ex.Message);
    }

    [Fact]
    public async Task AddTeamMember_WithPasswordMissingUppercase_ShouldThrowException()
    {
        // Arrange
        await using var dbContext = CreateInMemoryDbContext();
        await SeedRolesAsync(dbContext);

        var service = new AdminRoleService(dbContext, _loggerMock.Object);
        var request = new CreateAdminTeamMemberDto
        {
            Name = "No Uppercase Admin",
            Email = "noupper@skillbridge.vn",
            Password = "password1234!",  // Lowercase only - no uppercase
            RoleId = 2
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.AddTeamMemberAsync(request, 1));

        Assert.Contains("viết hoa", ex.Message);
    }

    [Fact]
    public async Task AddTeamMember_WithPasswordMissingLowercase_ShouldThrowException()
    {
        // Arrange
        await using var dbContext = CreateInMemoryDbContext();
        await SeedRolesAsync(dbContext);

        var service = new AdminRoleService(dbContext, _loggerMock.Object);
        var request = new CreateAdminTeamMemberDto
        {
            Name = "No Lowercase Admin",
            Email = "nolower@skillbridge.vn",
            Password = "PASSWORD1234!",  // Uppercase only - no lowercase
            RoleId = 2
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.AddTeamMemberAsync(request, 1));

        Assert.Contains("viết thường", ex.Message);
    }

    [Fact]
    public async Task AddTeamMember_WithPasswordMissingDigit_ShouldThrowException()
    {
        // Arrange
        await using var dbContext = CreateInMemoryDbContext();
        await SeedRolesAsync(dbContext);

        var service = new AdminRoleService(dbContext, _loggerMock.Object);
        var request = new CreateAdminTeamMemberDto
        {
            Name = "No Digit Admin",
            Email = "nodigit@skillbridge.vn",
            Password = "Passwords!!!",  // No digit
            RoleId = 2
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.AddTeamMemberAsync(request, 1));

        Assert.Contains("chữ số", ex.Message);
    }

    [Fact]
    public async Task AddTeamMember_WithPasswordMissingSpecialChar_ShouldThrowException()
    {
        // Arrange
        await using var dbContext = CreateInMemoryDbContext();
        await SeedRolesAsync(dbContext);

        var service = new AdminRoleService(dbContext, _loggerMock.Object);
        var request = new CreateAdminTeamMemberDto
        {
            Name = "No Special Char Admin",
            Email = "nospecial@skillbridge.vn",
            Password = "Password1234",  // No special character
            RoleId = 2
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.AddTeamMemberAsync(request, 1));

        Assert.Contains("ký tự đặc biệt", ex.Message);
    }

    [Fact]
    public async Task AddTeamMember_WithValidStrongPassword_ShouldSucceed()
    {
        // Arrange
        await using var dbContext = CreateInMemoryDbContext();
        await SeedRolesAsync(dbContext);

        var service = new AdminRoleService(dbContext, _loggerMock.Object);
        var request = new CreateAdminTeamMemberDto
        {
            Name = "Strong Password Admin",
            Email = "strong.pass@skillbridge.vn",
            Password = "StrongP@ssw0rd123",  // Valid: 12+ chars, upper, lower, digit, special
            RoleId = 2
        };

        // Act
        var result = await service.AddTeamMemberAsync(request, 1);

        // Assert
        Assert.NotNull(result);
        var createdUser = await dbContext.Users.FirstOrDefaultAsync(u => u.Email == "strong.pass@skillbridge.vn");
        Assert.NotNull(createdUser);
    }

    #endregion

    #region FIX-3: Transaction Isolation Tests

    [Fact]
    public async Task AddTeamMember_OnSuccess_ShouldCreateBothUserAndAdminMember()
    {
        // Arrange
        await using var dbContext = CreateInMemoryDbContext();
        await SeedRolesAsync(dbContext);

        var service = new AdminRoleService(dbContext, _loggerMock.Object);
        var request = new CreateAdminTeamMemberDto
        {
            Name = "Dual Write Test",
            Email = "dual.write@skillbridge.vn",
            Password = "DualWrite@Pass123",
            RoleId = 2
        };

        // Act
        var result = await service.AddTeamMemberAsync(request, 1);

        // Assert - Verify both tables have the record
        var adminMember = await dbContext.AdminTeamMembers.FirstOrDefaultAsync(m => m.Email == "dual.write@skillbridge.vn");
        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Email == "dual.write@skillbridge.vn");

        Assert.NotNull(adminMember);
        Assert.NotNull(user);
        Assert.Equal(adminMember.Name, user.FullName);
        Assert.Equal(adminMember.RoleId, user.RoleId);
    }

    [Fact]
    public async Task AddTeamMember_WithExistingUser_ShouldRejectAndKeepUserIntact()
    {
        // Arrange
        await using var dbContext = CreateInMemoryDbContext();
        await SeedRolesAsync(dbContext);

        // Pre-create a user
        var existingUser = new User
        {
            Email = "existing.user@skillbridge.vn",
            FullName = "Old Name",
            PasswordHash = "oldhash",
            RoleId = 1,
            AccountStatus = "pending",
            KycStatus = "pending",
            ReliabilityScore = 50,
            TokenVersion = 1,
            JoinedAt = DateTime.UtcNow
        };
        await dbContext.Users.AddAsync(existingUser);
        await dbContext.SaveChangesAsync();

        var service = new AdminRoleService(dbContext, _loggerMock.Object);
        var request = new CreateAdminTeamMemberDto
        {
            Name = "Updated Admin",
            Email = "existing.user@skillbridge.vn",
            Password = "UpdatedP@ss123",
            RoleId = 2
        };

        // Act & Assert - email đã thuộc về user khác phải bị từ chối
        await Assert.ThrowsAsync<BusinessException>(() => service.AddTeamMemberAsync(request, 1));

        // User gốc giữ nguyên, không có admin member nào được tạo
        var user = await dbContext.Users.AsNoTracking().SingleAsync(u => u.Email == "existing.user@skillbridge.vn");
        Assert.Equal("Old Name", user.FullName);
        Assert.Equal("oldhash", user.PasswordHash);
        Assert.Equal(1, user.RoleId);
        Assert.Equal("pending", user.AccountStatus);
        Assert.False(await dbContext.AdminTeamMembers.AnyAsync(m => m.Email == "existing.user@skillbridge.vn"));
    }

    [Fact]
    public async Task AddTeamMember_WithDuplicateEmail_ShouldThrowBeforeTransaction()
    {
        // Arrange
        await using var dbContext = CreateInMemoryDbContext();
        await SeedRolesAsync(dbContext);

        // Pre-create an admin member
        var existingMember = new AdminTeamMember
        {
            Name = "Existing Admin",
            Email = "duplicate@skillbridge.vn",
            RoleId = 2,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        await dbContext.AdminTeamMembers.AddAsync(existingMember);
        await dbContext.SaveChangesAsync();

        var service = new AdminRoleService(dbContext, _loggerMock.Object);
        var request = new CreateAdminTeamMemberDto
        {
            Name = "Duplicate Admin",
            Email = "duplicate@skillbridge.vn",
            Password = "DuplicateP@ss123",
            RoleId = 2
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.AddTeamMemberAsync(request, 1));

        Assert.Contains("đã tồn tại", ex.Message);
    }

    [Fact]
    public async Task AddTeamMember_WithInvalidRole_ShouldThrowException()
    {
        // Arrange
        await using var dbContext = CreateInMemoryDbContext();
        await SeedRolesAsync(dbContext);

        var service = new AdminRoleService(dbContext, _loggerMock.Object);
        var request = new CreateAdminTeamMemberDto
        {
            Name = "Invalid Role Admin",
            Email = "invalid.role@skillbridge.vn",
            Password = "InvalidRole@Pass123",
            RoleId = 999  // Non-existent role
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.AddTeamMemberAsync(request, 1));

        Assert.Contains("vai trò", ex.Message);
    }

    [Fact]
    public async Task AddTeamMember_ShouldCreateAuditLog()
    {
        // Arrange
        await using var dbContext = CreateInMemoryDbContext();
        await SeedRolesAsync(dbContext);

        var adminMember = new AdminTeamMember
        {
            Id = 1,
            Name = "Root Admin",
            Email = "root@skillbridge.vn",
            RoleId = 1,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        await dbContext.AdminTeamMembers.AddAsync(adminMember);
        await dbContext.SaveChangesAsync();

        var service = new AdminRoleService(dbContext, _loggerMock.Object);
        var request = new CreateAdminTeamMemberDto
        {
            Name = "Audit Log Test",
            Email = "audit.test@skillbridge.vn",
            Password = "AuditTest@Pass123",
            RoleId = 2
        };

        // Act
        var result = await service.AddTeamMemberAsync(request, 1);

        // Assert
        var auditLog = await dbContext.AuditLogs.FirstOrDefaultAsync(a => a.ActionText.Contains("audit.test@skillbridge.vn"));
        Assert.NotNull(auditLog);
        Assert.Contains("Thêm thành viên quản trị mới", auditLog.ActionText);
    }

    #endregion
}
