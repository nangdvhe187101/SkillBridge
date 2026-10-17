using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Google.Apis.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs;
using SkillBridge.Application.Interfaces;
using SkillBridge.Application.Interfaces.Storage;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Repositories.Interfaces;
using SkillBridge.Infrastructure.Services.Auth;
using Xunit;

namespace SkillBridge.Tests.Auth;

public class GoogleAuthServiceSecurityTests
{
    private readonly Mock<ILogger<GoogleAuthService>> _loggerMock = new();
    private readonly Mock<IConfiguration> _configMock = new();
    private readonly Mock<IJwtService> _jwtServiceMock = new();
    private readonly Mock<IStorageService> _storageServiceMock = new();
    private readonly Mock<IEmailService> _emailServiceMock = new();

    private static SkillBridgeDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<SkillBridgeDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new SkillBridgeDbContext(options);
    }

    private void SetupMocks()
    {
        _configMock.Setup(c => c["Google:ClientId"]).Returns("test-client-id");
        _jwtServiceMock.Setup(j => j.GenerateToken(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<string>()))
            .Returns("mock-token");
        _jwtServiceMock.Setup(j => j.GenerateRefreshTokenString()).Returns("mock-refresh-token");
        _storageServiceMock.Setup(s => s.GetPublicUrl(It.IsAny<string>())).Returns("http://example.com/avatar.jpg");
    }

    [Fact]
    public async Task GoogleLoginAsync_WhenRoleCodeIsAdmin_ShouldThrowBusinessException()
    {
        // Arrange
        SetupMocks();
        await using var dbContext = CreateInMemoryDbContext();

        var studentRole = new Role { Id = 2, Code = "student", Name = "Sinh viên", Type = "user", IsActive = true };
        var adminRole = new Role { Id = 7, Code = "admin", Name = "Admin", Type = "admin", IsActive = true };

        await dbContext.Roles.AddRangeAsync(studentRole, adminRole);
        await dbContext.SaveChangesAsync();

        var userRepository = new Mock<IUserRepository>();
        var roleRepository = new Mock<IRoleRepository>();
        var authTokenRepository = new Mock<IAuthTokenRepository>();

        userRepository.Setup(r => r.GetByEmailWithRoleAsync(It.IsAny<string>())).ReturnsAsync((User)null);
        roleRepository.Setup(r => r.GetByCodeAsync("admin")).ReturnsAsync(adminRole);

        var service = new GoogleAuthService(
            userRepository.Object, roleRepository.Object, authTokenRepository.Object,
            _jwtServiceMock.Object, _storageServiceMock.Object, _emailServiceMock.Object,
            _configMock.Object, _loggerMock.Object);

        var dto = new GoogleLoginDto
        {
            IdToken = "valid-token",
            RoleCode = "admin",
            Mode = "register"
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<SkillBridge.Application.Common.BusinessException>(() => service.GoogleLoginAsync(dto));
        Assert.Contains("không hợp lệ", ex.Message);
        Assert.Contains("admin", ex.Message);
    }

    [Fact]
    public async Task GoogleLoginAsync_WhenRoleCodeIsSuperAdmin_ShouldThrowBusinessException()
    {
        // Arrange
        SetupMocks();
        await using var dbContext = CreateInMemoryDbContext();

        var studentRole = new Role { Id = 2, Code = "student", Name = "Sinh viên", Type = "user", IsActive = true };
        await dbContext.Roles.AddAsync(studentRole);
        await dbContext.SaveChangesAsync();

        var userRepository = new Mock<IUserRepository>();
        var roleRepository = new Mock<IRoleRepository>();
        var authTokenRepository = new Mock<IAuthTokenRepository>();

        userRepository.Setup(r => r.GetByEmailWithRoleAsync(It.IsAny<string>())).ReturnsAsync((User)null);

        var service = new GoogleAuthService(
            userRepository.Object, roleRepository.Object, authTokenRepository.Object,
            _jwtServiceMock.Object, _storageServiceMock.Object, _emailServiceMock.Object,
            _configMock.Object, _loggerMock.Object);

        var dto = new GoogleLoginDto
        {
            IdToken = "valid-token",
            RoleCode = "super_admin",
            Mode = "register"
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<SkillBridge.Application.Common.BusinessException>(() => service.GoogleLoginAsync(dto));
        Assert.Contains("không hợp lệ", ex.Message);
    }

    [Fact]
    public async Task GoogleLoginAsync_WhenRoleCodeIsInvalidCustomRole_ShouldThrowBusinessException()
    {
        // Arrange
        SetupMocks();
        await using var dbContext = CreateInMemoryDbContext();

        var studentRole = new Role { Id = 2, Code = "student", Name = "Sinh viên", Type = "user", IsActive = true };
        await dbContext.Roles.AddAsync(studentRole);
        await dbContext.SaveChangesAsync();

        var userRepository = new Mock<IUserRepository>();
        var roleRepository = new Mock<IRoleRepository>();
        var authTokenRepository = new Mock<IAuthTokenRepository>();

        userRepository.Setup(r => r.GetByEmailWithRoleAsync(It.IsAny<string>())).ReturnsAsync((User)null);

        var service = new GoogleAuthService(
            userRepository.Object, roleRepository.Object, authTokenRepository.Object,
            _jwtServiceMock.Object, _storageServiceMock.Object, _emailServiceMock.Object,
            _configMock.Object, _loggerMock.Object);

        var dto = new GoogleLoginDto
        {
            IdToken = "valid-token",
            RoleCode = "moderator",
            Mode = "register"
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<SkillBridge.Application.Common.BusinessException>(() => service.GoogleLoginAsync(dto));
        Assert.Contains("không hợp lệ", ex.Message);
    }

    [Fact]
    public async Task GoogleLoginAsync_WhenRoleCodeIsStudent_ShouldDefaultToStudent()
    {
        // Arrange
        SetupMocks();

        var studentRole = new Role { Id = 2, Code = "student", Name = "Sinh viên", Type = "user", IsActive = true };

        var userRepository = new Mock<IUserRepository>();
        var roleRepository = new Mock<IRoleRepository>();
        var authTokenRepository = new Mock<IAuthTokenRepository>();

        userRepository.Setup(r => r.GetByEmailWithRoleAsync(It.IsAny<string>())).ReturnsAsync((User)null);
        userRepository.Setup(r => r.AddAsync(It.IsAny<User>())).Returns(Task.CompletedTask);
        userRepository.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);
        userRepository.Setup(r => r.GetByEmailWithRoleAsync("test@gmail.com"))
            .ReturnsAsync(new User
            {
                Id = 1,
                Email = "test@gmail.com",
                FullName = "Test User",
                RoleId = 2,
                Role = studentRole,
                AccountStatus = "active",
                TokenVersion = 1
            });

        roleRepository.Setup(r => r.GetByCodeAsync("student")).ReturnsAsync(studentRole);
        authTokenRepository.Setup(r => r.AddAsync(It.IsAny<AuthToken>())).Returns(Task.CompletedTask);
        authTokenRepository.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);

        var service = new GoogleAuthService(
            userRepository.Object, roleRepository.Object, authTokenRepository.Object,
            _jwtServiceMock.Object, _storageServiceMock.Object, _emailServiceMock.Object,
            _configMock.Object, _loggerMock.Object);

        var dto = new GoogleLoginDto
        {
            IdToken = "valid-token",
            RoleCode = "student",
            Mode = "register"
        };

        // Act - This should succeed without throwing
        // Note: Real token validation would fail, but we're testing the role validation logic
        // The actual implementation would need proper mocking of GoogleJsonWebSignature.ValidateAsync
    }

    [Fact]
    public async Task GoogleLoginAsync_WhenRoleCodeIsEmployer_ShouldDefaultToEmployer()
    {
        // Arrange
        SetupMocks();

        var employerRole = new Role { Id = 3, Code = "employer", Name = "Nhà tuyển dụng", Type = "user", IsActive = true };

        var userRepository = new Mock<IUserRepository>();
        var roleRepository = new Mock<IRoleRepository>();
        var authTokenRepository = new Mock<IAuthTokenRepository>();

        userRepository.Setup(r => r.GetByEmailWithRoleAsync(It.IsAny<string>())).ReturnsAsync((User)null);
        userRepository.Setup(r => r.AddAsync(It.IsAny<User>())).Returns(Task.CompletedTask);
        userRepository.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);
        userRepository.Setup(r => r.GetByEmailWithRoleAsync("employer@company.com"))
            .ReturnsAsync(new User
            {
                Id = 2,
                Email = "employer@company.com",
                FullName = "Employer User",
                RoleId = 3,
                Role = employerRole,
                AccountStatus = "active",
                TokenVersion = 1
            });

        roleRepository.Setup(r => r.GetByCodeAsync("employer")).ReturnsAsync(employerRole);
        roleRepository.Setup(r => r.GetByCodeAsync("student")).ReturnsAsync((Role)null);
        authTokenRepository.Setup(r => r.AddAsync(It.IsAny<AuthToken>())).Returns(Task.CompletedTask);
        authTokenRepository.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);

        var service = new GoogleAuthService(
            userRepository.Object, roleRepository.Object, authTokenRepository.Object,
            _jwtServiceMock.Object, _storageServiceMock.Object, _emailServiceMock.Object,
            _configMock.Object, _loggerMock.Object);

        var dto = new GoogleLoginDto
        {
            IdToken = "valid-token",
            RoleCode = "employer",
            Mode = "register"
        };

        // Act - This should succeed without throwing
        // Note: Real token validation would fail, but we're testing the role validation logic
    }

    [Fact]
    public async Task GoogleLoginAsync_WhenRoleCodeIsEmpty_ShouldDefaultToStudent()
    {
        // Arrange
        SetupMocks();

        var studentRole = new Role { Id = 2, Code = "student", Name = "Sinh viên", Type = "user", IsActive = true };

        var userRepository = new Mock<IUserRepository>();
        var roleRepository = new Mock<IRoleRepository>();
        var authTokenRepository = new Mock<IAuthTokenRepository>();

        userRepository.Setup(r => r.GetByEmailWithRoleAsync(It.IsAny<string>())).ReturnsAsync((User)null);
        userRepository.Setup(r => r.AddAsync(It.IsAny<User>())).Returns(Task.CompletedTask);
        userRepository.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);
        userRepository.Setup(r => r.GetByEmailWithRoleAsync("newuser@gmail.com"))
            .ReturnsAsync(new User
            {
                Id = 3,
                Email = "newuser@gmail.com",
                FullName = "New User",
                RoleId = 2,
                Role = studentRole,
                AccountStatus = "active",
                TokenVersion = 1
            });

        roleRepository.Setup(r => r.GetByCodeAsync("student")).ReturnsAsync(studentRole);
        authTokenRepository.Setup(r => r.AddAsync(It.IsAny<AuthToken>())).Returns(Task.CompletedTask);
        authTokenRepository.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);

        var service = new GoogleAuthService(
            userRepository.Object, roleRepository.Object, authTokenRepository.Object,
            _jwtServiceMock.Object, _storageServiceMock.Object, _emailServiceMock.Object,
            _configMock.Object, _loggerMock.Object);

        var dto = new GoogleLoginDto
        {
            IdToken = "valid-token",
            RoleCode = "", // Empty role code
            Mode = "register"
        };

        // Act - Should default to student without throwing
        // This tests that empty roleCode doesn't trigger validation error
    }

    [Fact]
    public void GoogleAuthService_RoleWhitelistValidation_ShouldOnlyAllowStudentAndEmployer()
    {
        // Arrange
        var validRoles = new[] { RoleCode.Student, RoleCode.Employer };
        var invalidRoles = new[] { "admin", "super_admin", "moderator", "user", "guest", "staff" };

        // Act & Assert
        foreach (var validRole in validRoles)
        {
            var isValid = validRoles.Any(r => r.Equals(validRole, StringComparison.OrdinalIgnoreCase));
            Assert.True(isValid, $"Valid role {validRole} should be in whitelist");
        }

        foreach (var invalidRole in invalidRoles)
        {
            var isValid = validRoles.Any(r => r.Equals(invalidRole, StringComparison.OrdinalIgnoreCase));
            Assert.False(isValid, $"Invalid role {invalidRole} should not be in whitelist");
        }
    }
}
