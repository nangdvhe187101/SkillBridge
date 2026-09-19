using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Data;

public static class DbInitializer
{
    public static async Task SeedAdminAsync(SkillBridgeDbContext context, IConfiguration configuration, ILogger? logger = null)
    {
        var adminConfig = configuration.GetSection("AdminSeed");
        var email = adminConfig["Email"]?.Trim().ToLowerInvariant();
        var rawPassword = adminConfig["Password"];
        var fullName = adminConfig["FullName"] ?? "Quản Trị Viên";
        var phone = adminConfig["PhoneNumber"] ?? "0900000000";

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(rawPassword))
        {
            logger?.LogInformation("AdminSeed: Chưa cấu hình Email hoặc Password trong cấu hình AdminSeed. Bỏ qua khởi tạo.");
            return;
        }

        // 1. Đảm bảo Role 'admin' tồn tại
        var adminRole = await context.Roles.FirstOrDefaultAsync(r => r.Code == "admin");
        if (adminRole == null)
        {
            adminRole = new Role
            {
                Code = "admin",
                Name = "Quản trị viên",
                Description = "Quản trị viên toàn quyền hệ thống",
                Type = "admin",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            await context.Roles.AddAsync(adminRole);
            await context.SaveChangesAsync();
            logger?.LogInformation("AdminSeed: Đã tạo Role 'admin' thành công.");
        }

        // 2. Mã hóa mật khẩu bằng BCrypt
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(rawPassword, workFactor: 11);

        // Kiểm tra tránh trùng lặp số điện thoại với tài khoản khác (Unique Constraint)
        string? adminPhone = phone;
        if (!string.IsNullOrWhiteSpace(adminPhone))
        {
            var phoneConflict = await context.Users.AnyAsync(u => u.PhoneNumber == adminPhone && u.Email != email);
            if (phoneConflict)
            {
                logger?.LogWarning("AdminSeed: Số điện thoại {Phone} đã được liên kết với một tài khoản khác trong hệ thống. Đặt PhoneNumber = null cho Admin.", adminPhone);
                adminPhone = null;
            }
        }

        // 3. Kiểm tra xem User Admin đã tồn tại chưa
        var adminUser = await context.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (adminUser == null)
        {
            adminUser = new User
            {
                FullName = fullName,
                Email = email,
                PhoneNumber = adminPhone,
                PasswordHash = passwordHash,
                RoleId = adminRole.Id,
                AccountStatus = "active",
                KycStatus = "verified",
                ReliabilityScore = 100,
                JobsDoneCount = 0,
                TokenVersion = 1,
                FailedLoginAttempts = 0,
                JoinedAt = DateTime.UtcNow
            };

            await context.Users.AddAsync(adminUser);
            await context.SaveChangesAsync();
            logger?.LogInformation("AdminSeed: Đã tạo tài khoản Admin {Email} thành công với mật khẩu đã cấu hình.", email);
        }
        else
        {
            // Cập nhật lại Role và PasswordHash nếu cấu hình có thay đổi
            adminUser.RoleId = adminRole.Id;
            adminUser.PasswordHash = passwordHash;
            if (adminPhone != null)
            {
                adminUser.PhoneNumber = adminPhone;
            }
            adminUser.AccountStatus = "active";
            adminUser.FailedLoginAttempts = 0;
            adminUser.LockoutUntil = null;
            await context.SaveChangesAsync();
            logger?.LogInformation("AdminSeed: Tài khoản {Email} đã tồn tại, đã cập nhật mật khẩu mới và kích hoạt tài khoản.", email);
        }

        // 4. Đảm bảo bảng admin_team_members có bản ghi tương ứng để phục vụ các chức năng duyệt của Admin
        var adminTeamMember = await context.AdminTeamMembers.FirstOrDefaultAsync(a => a.Email == email);
        if (adminTeamMember == null)
        {
            adminTeamMember = new AdminTeamMember
            {
                Name = adminUser.FullName,
                Email = email,
                RoleId = adminRole.Id,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            await context.AdminTeamMembers.AddAsync(adminTeamMember);
            await context.SaveChangesAsync();
            logger?.LogInformation("AdminSeed: Đã đồng bộ tài khoản {Email} vào bảng admin_team_members.", email);
        }
    }

    public static async Task EnsureChatSchemaAsync(SkillBridgeDbContext context, ILogger? logger = null)
    {
        try
        {
            await context.Database.ExecuteSqlRawAsync(@"
                SET @dbname = DATABASE();
                SET @tablename = 'conversations';

                -- is_read_only
                SET @col = 'is_read_only';
                SET @sql = (SELECT IF(
                    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col) > 0,
                    'SELECT 1',
                    'ALTER TABLE conversations ADD COLUMN is_read_only TINYINT(1) NOT NULL DEFAULT 0'
                ));
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

                -- read_only_reason
                SET @col = 'read_only_reason';
                SET @sql = (SELECT IF(
                    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col) > 0,
                    'SELECT 1',
                    'ALTER TABLE conversations ADD COLUMN read_only_reason VARCHAR(50) NULL DEFAULT NULL'
                ));
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

                -- is_archived_user_a
                SET @col = 'is_archived_user_a';
                SET @sql = (SELECT IF(
                    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col) > 0,
                    'SELECT 1',
                    'ALTER TABLE conversations ADD COLUMN is_archived_user_a TINYINT(1) NOT NULL DEFAULT 0'
                ));
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

                -- is_archived_user_b
                SET @col = 'is_archived_user_b';
                SET @sql = (SELECT IF(
                    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col) > 0,
                    'SELECT 1',
                    'ALTER TABLE conversations ADD COLUMN is_archived_user_b TINYINT(1) NOT NULL DEFAULT 0'
                ));
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

                -- request_status
                SET @col = 'request_status';
                SET @sql = (SELECT IF(
                    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col) > 0,
                    'SELECT 1',
                    'ALTER TABLE conversations ADD COLUMN request_status VARCHAR(20) NOT NULL DEFAULT \'active\''
                ));
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

                -- request_initiated_by
                SET @col = 'request_initiated_by';
                SET @sql = (SELECT IF(
                    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col) > 0,
                    'SELECT 1',
                    'ALTER TABLE conversations ADD COLUMN request_initiated_by INT NULL DEFAULT NULL'
                ));
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
            ");
            logger?.LogInformation("DbInitializer: Đã đảm bảo schema bảng conversations cập nhật đầy đủ.");
        }
        catch (Exception ex)
        {
            logger?.LogWarning(ex, "DbInitializer: Lỗi cập nhật schema bảng conversations.");
        }
    }
}
