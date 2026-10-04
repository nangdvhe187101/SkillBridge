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

public class AdminRoleServiceTests
{
    private readonly Mock<ILogger<AdminRoleService>> _loggerMock = new();

    private SkillBridgeDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<SkillBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new SkillBridgeDbContext(options);
    }

    [Fact]
    public async Task GetTeamMembersAsync_ShouldReturnActiveMembers()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new AdminRoleService(dbContext, _loggerMock.Object);

        // Act
        var members = await service.GetTeamMembersAsync();

        // Assert - Đã tự động seed ban đầu
        Assert.NotEmpty(members);
        Assert.Contains(members, m => m.Email.Contains("@skillbridge.vn"));
    }

    [Fact]
    public async Task AddTeamMemberAsync_ShouldCreateMember_AndRecordAuditLog()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new AdminRoleService(dbContext, _loggerMock.Object);

        var actor = new User
        {
            Id = 1,
            FullName = "Admin Root",
            Email = "root@skillbridge.vn",
            PasswordHash = "hash",
            AccountStatus = "active",
            KycStatus = "verified",
            Role = new Role { Id = 1, Code = "admin", Name = "Admin", Type = "admin", IsActive = true }
        };
        dbContext.Users.Add(actor);
        await dbContext.SaveChangesAsync();

        var dto = new CreateAdminTeamMemberDto
        {
            Name = "Lê Hoàng Long",
            Email = "longlh@skillbridge.vn",
            RoleCode = "moderator"
        };

        // Act
        var result = await service.AddTeamMemberAsync(dto, 1);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Lê Hoàng Long", result.Name);
        Assert.Equal("longlh@skillbridge.vn", result.Email);
        Assert.True(result.IsActive);

        var memberInDb = await dbContext.AdminTeamMembers.FirstOrDefaultAsync(m => m.Email == "longlh@skillbridge.vn");
        Assert.NotNull(memberInDb);

        var audit = await dbContext.AuditLogs.FirstOrDefaultAsync(a => a.ActionText.Contains("Lê Hoàng Long"));
        Assert.NotNull(audit);
    }

    [Fact]
    public async Task AddTeamMemberAsync_WhenEmailExists_ShouldThrowBusinessException()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new AdminRoleService(dbContext, _loggerMock.Object);

        var dto = new CreateAdminTeamMemberDto
        {
            Name = "Test Duplicate",
            Email = "duplicate@skillbridge.vn",
            RoleCode = "moderator"
        };

        await service.AddTeamMemberAsync(dto, 1);

        // Act & Assert
        await Assert.ThrowsAsync<BusinessException>(() => service.AddTeamMemberAsync(dto, 1));
    }

    [Fact]
    public async Task UpdateTeamMemberRoleAsync_ShouldChangeRole_AndRecordAuditLog()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new AdminRoleService(dbContext, _loggerMock.Object);

        var member = await service.AddTeamMemberAsync(new CreateAdminTeamMemberDto
        {
            Name = "Trần Thị Lan",
            Email = "lantt@skillbridge.vn",
            RoleCode = "moderator"
        }, 1);

        var updateDto = new UpdateAdminTeamMemberRoleDto
        {
            RoleCode = "finance",
            IsActive = false
        };

        // Act
        var updated = await service.UpdateTeamMemberRoleAsync(member.Id, updateDto, 1);

        // Assert
        Assert.Equal("finance", updated.RoleCode);
        Assert.False(updated.IsActive);

        var audit = await dbContext.AuditLogs.FirstOrDefaultAsync(a => a.ActionText.Contains("Trần Thị Lan"));
        Assert.NotNull(audit);
    }

    [Fact]
    public async Task DeleteTeamMemberAsync_ShouldRemoveMember_AndRecordAuditLog()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new AdminRoleService(dbContext, _loggerMock.Object);

        var member = await service.AddTeamMemberAsync(new CreateAdminTeamMemberDto
        {
            Name = "Người Sắp Bị Xóa",
            Email = "tobedeleted@skillbridge.vn",
            RoleCode = "moderator"
        }, 1);

        // Act
        await service.DeleteTeamMemberAsync(member.Id, 1);

        // Assert
        var exists = await dbContext.AdminTeamMembers.AnyAsync(m => m.Id == member.Id);
        Assert.False(exists);

        var audit = await dbContext.AuditLogs.FirstOrDefaultAsync(a => a.ActionText.Contains("Người Sắp Bị Xóa"));
        Assert.NotNull(audit);
    }

    [Fact]
    public async Task GetPermissionMatrixAsync_ShouldReturnPermissionsWithRoles()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new AdminRoleService(dbContext, _loggerMock.Object);

        // Act
        var matrix = await service.GetPermissionMatrixAsync();

        // Assert - Có seed sẵn các route quan trọng
        Assert.NotEmpty(matrix);
        Assert.Contains(matrix, p => p.Url == "/wallet");
        Assert.Contains(matrix, p => p.Url == "/admin");
    }

    [Fact]
    public async Task ToggleRolePermissionAsync_ShouldAddOrRemoveRolePermission()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var service = new AdminRoleService(dbContext, _loggerMock.Object);

        var matrix = await service.GetPermissionMatrixAsync();
        var targetPerm = matrix.First(p => p.Url == "/admin");

        // Act 1: Cấp quyền admin vào route nếu chưa có
        await service.ToggleRolePermissionAsync(new ToggleRolePermissionDto
        {
            PermissionId = targetPerm.Id,
            RoleCode = "admin",
            IsGranted = true
        }, 1);

        var permWithAdmin = await service.GetPermissionMatrixAsync();
        Assert.Contains("admin", permWithAdmin.First(p => p.Id == targetPerm.Id).Roles);

        // Act 2: Tước quyền admin
        await service.ToggleRolePermissionAsync(new ToggleRolePermissionDto
        {
            PermissionId = targetPerm.Id,
            RoleCode = "admin",
            IsGranted = false
        }, 1);

        var permWithoutAdmin = await service.GetPermissionMatrixAsync();
        Assert.DoesNotContain("admin", permWithoutAdmin.First(p => p.Id == targetPerm.Id).Roles);
    }
}
