using System;
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
/// Khôi phục tài khoản user bị chuyển nhầm thành nhân sự quản trị
/// </summary>
public class AdminRestoreUserAccountTests
{
    private const string StrongPassword = "NewP@ss123";

    private static SkillBridgeDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<SkillBridgeDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new SkillBridgeDbContext(options);
    }

    private static async Task<(SkillBridgeDbContext db, User victim, AdminTeamMember member, User actor)> SeedHijackedAccountAsync()
    {
        var db = CreateDbContext();
        db.Roles.AddRange(
            new Role { Id = 1, Code = "student", Name = "Sinh viên", Type = "user", IsActive = true, CreatedAt = DateTime.UtcNow },
            new Role { Id = 2, Code = "employer", Name = "Nhà tuyển dụng", Type = "user", IsActive = true, CreatedAt = DateTime.UtcNow },
            new Role { Id = 3, Code = "super_admin", Name = "Super Admin", Type = "admin", IsActive = true, CreatedAt = DateTime.UtcNow },
            new Role { Id = 8, Code = "business_admin", Name = "Business Admin", Type = "admin", IsActive = true, CreatedAt = DateTime.UtcNow });

        var actor = new User { Id = 10, FullName = "Root", Email = "skillbridge.vn@gmail.com", PasswordHash = "x", RoleId = 3, AccountStatus = "active", KycStatus = "verified", JoinedAt = DateTime.UtcNow };
        var victim = new User { Id = 20, FullName = "Ghi đè bởi admin", Email = "victim@fpt.edu.vn", PasswordHash = "admin-hash", RoleId = 8, AccountStatus = "active", KycStatus = "verified", TokenVersion = 3, JoinedAt = DateTime.UtcNow };
        db.Users.AddRange(actor, victim);

        db.AdminTeamMembers.Add(new AdminTeamMember { Id = 1, Name = "Root", Email = actor.Email, RoleId = 3, IsActive = true, CreatedAt = DateTime.UtcNow });
        var member = new AdminTeamMember { Id = 2, Name = "Ghi đè bởi admin", Email = victim.Email, RoleId = 8, IsActive = true, CreatedAt = DateTime.UtcNow };
        db.AdminTeamMembers.Add(member);

        db.AuthTokens.Add(new AuthToken { Id = 1, UserId = victim.Id, TokenType = TokenTypes.Refresh, TokenHash = "h", MaxAttempts = 5, ExpiresAt = DateTime.UtcNow.AddDays(7), CreatedAt = DateTime.UtcNow });

        await db.SaveChangesAsync();
        return (db, victim, member, actor);
    }

    private static AdminRoleService CreateService(SkillBridgeDbContext db) =>
        new(db, new Mock<ILogger<AdminRoleService>>().Object);

    [Fact]
    public async Task Restore_ReturnsUserRole_RemovesAdminMember_AndRevokesSessions()
    {
        var (db, victim, member, actor) = await SeedHijackedAccountAsync();
        var service = CreateService(db);

        var result = await service.RestoreUserAccountAsync(member.Id,
            new RestoreUserAccountDto { RoleCode = "student", NewPassword = StrongPassword }, actor.Id, CancellationToken.None);

        var user = await db.Users.AsNoTracking().SingleAsync(u => u.Id == victim.Id);
        Assert.Equal(1, user.RoleId);
        Assert.Equal("student", result.RoleCode);
        Assert.True(BCrypt.Net.BCrypt.Verify(StrongPassword, user.PasswordHash));
        Assert.Equal(4, user.TokenVersion);
        Assert.Equal("active", user.AccountStatus);
        Assert.False(await db.AdminTeamMembers.AnyAsync(m => m.Id == member.Id));
        Assert.NotNull((await db.AuthTokens.AsNoTracking().SingleAsync()).UsedAt);
    }

    [Fact]
    public async Task Restore_RecoversNameSchoolAndKyc_FromStudentProfile()
    {
        var (db, victim, member, actor) = await SeedHijackedAccountAsync();
        db.Schools.Add(new School { Id = 5, Name = "Đại học FPT" });
        db.StudentVerificationRequests.Add(new StudentVerificationRequest
        {
            Id = 7, UserId = victim.Id, Status = "approved", SchoolId = 5, StudentCode = "HE187126",
            StudentCodeNormalized = "HE187126", FullNameOnCard = "Nguyễn Thế Hiếu", GraduationYear = 2027, SubmittedAt = DateTime.UtcNow
        });
        db.StudentProfiles.Add(new StudentProfile
        {
            UserId = victim.Id, SchoolId = 5, StudentCode = "HE187126", StudentCodeNormalized = "HE187126",
            VerifiedFullName = "Nguyễn Thế Hiếu", GraduationYear = 2027, VerifiedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddYears(1), SourceRequestId = 7
        });
        await db.SaveChangesAsync();

        var result = await CreateService(db).RestoreUserAccountAsync(member.Id,
            new RestoreUserAccountDto { RoleCode = "student", NewPassword = StrongPassword }, actor.Id, CancellationToken.None);

        var user = await db.Users.AsNoTracking().SingleAsync(u => u.Id == victim.Id);
        Assert.Equal("Nguyễn Thế Hiếu", user.FullName);
        Assert.Equal("Đại học FPT", user.School);
        Assert.Equal(5, user.SchoolId);
        Assert.Equal("verified", user.KycStatus);
        Assert.Contains(result.RecoveredFields, f => f.StartsWith("Họ tên"));
    }

    [Fact]
    public async Task Restore_WithoutVerificationData_ResetsKycToPending()
    {
        var (db, victim, member, actor) = await SeedHijackedAccountAsync();

        await CreateService(db).RestoreUserAccountAsync(member.Id,
            new RestoreUserAccountDto { RoleCode = "employer", NewPassword = StrongPassword, FullName = "Công ty A" }, actor.Id, CancellationToken.None);

        var user = await db.Users.AsNoTracking().SingleAsync(u => u.Id == victim.Id);
        Assert.Equal(2, user.RoleId);
        Assert.Equal("pending", user.KycStatus);
        Assert.Equal("Công ty A", user.FullName);
    }

    [Theory]
    [InlineData("super_admin", StrongPassword)]
    [InlineData("business_admin", StrongPassword)]
    [InlineData("student", "weak")]
    public async Task Restore_WithInvalidRoleOrWeakPassword_IsRejected_AndChangesNothing(string role, string password)
    {
        var (db, victim, member, actor) = await SeedHijackedAccountAsync();

        await Assert.ThrowsAsync<BusinessException>(() => CreateService(db).RestoreUserAccountAsync(member.Id,
            new RestoreUserAccountDto { RoleCode = role, NewPassword = password }, actor.Id, CancellationToken.None));

        var user = await db.Users.AsNoTracking().SingleAsync(u => u.Id == victim.Id);
        Assert.Equal(8, user.RoleId);
        Assert.True(await db.AdminTeamMembers.AnyAsync(m => m.Id == member.Id));
    }

    [Fact]
    public async Task Restore_RootSuperAdmin_IsRejected()
    {
        var (db, _, _, actor) = await SeedHijackedAccountAsync();

        await Assert.ThrowsAsync<BusinessException>(() => CreateService(db).RestoreUserAccountAsync(1,
            new RestoreUserAccountDto { RoleCode = "student", NewPassword = StrongPassword }, actor.Id, CancellationToken.None));
    }

    [Fact]
    public async Task GetTeamMembers_FlagsMemberWhoseEmailHasStudentData()
    {
        var (db, victim, member, _) = await SeedHijackedAccountAsync();
        db.CvFiles.Add(new CvFile { Id = 1, StudentId = victim.Id, FileName = "cv.pdf", FileUrl = "u", PublicId = "p", FileSize = 1, IsSearchable = true, UploadedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();

        var team = await CreateService(db).GetTeamMembersAsync(CancellationToken.None);

        var flagged = Assert.Single(team, m => m.Id == member.Id);
        Assert.True(flagged.HasUserActivity);
        Assert.Equal("student", flagged.SuggestedUserRoleCode);
        Assert.False(Assert.Single(team, m => m.Id == 1).HasUserActivity);
    }
}
