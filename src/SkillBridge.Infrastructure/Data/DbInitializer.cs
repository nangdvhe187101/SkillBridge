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

    public static async Task EnsureUserExtendedFieldsAsync(SkillBridgeDbContext context, ILogger? logger = null)
    {
        var targetColumns = new (string Name, string Type)[]
        {
            ("headline", "VARCHAR(255) NULL"),
            ("bio", "TEXT NULL"),
            ("tax_code", "VARCHAR(50) NULL"),
            ("representative", "VARCHAR(100) NULL"),
            ("address", "VARCHAR(255) NULL"),
            ("cover_image_url", "VARCHAR(500) NULL"),
            ("skills_json", "TEXT NULL"),
            ("education_json", "TEXT NULL"),
            ("experience_json", "TEXT NULL"),
            ("social_links_json", "TEXT NULL"),
            ("benefits_json", "TEXT NULL"),
            ("office_images_json", "TEXT NULL"),
            ("expected_hourly_rate", "DECIMAL(12,2) NULL"),
            ("school_id", "INT NULL"),
            ("student_code", "VARCHAR(50) NULL"),
            ("graduation_year", "SMALLINT NULL")
        };

        try
        {
            var existingColumns = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            var connection = context.Database.GetDbConnection();
            var wasOpen = connection.State == System.Data.ConnectionState.Open;
            if (!wasOpen) await connection.OpenAsync();

            try
            {
                using var cmd = connection.CreateCommand();
                cmd.CommandText = @"
                    SELECT COLUMN_NAME 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users';";
                using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    existingColumns.Add(reader.GetString(0));
                }
            }
            finally
            {
                if (!wasOpen) await connection.CloseAsync();
            }

            foreach (var (colName, colType) in targetColumns)
            {
                if (!existingColumns.Contains(colName))
                {
                    try
                    {
#pragma warning disable EF1002
                        var sql = $"ALTER TABLE `users` ADD COLUMN `{colName}` {colType};";
                        await context.Database.ExecuteSqlRawAsync(sql);
#pragma warning restore EF1002
                        logger?.LogInformation("DbInitializer: Đã thêm cột {Column} vào bảng users thành công.", colName);
                    }
                    catch (Exception ex)
                    {
                        logger?.LogWarning(ex, "DbInitializer: Không thể thêm cột {Column}.", colName);
                    }
                }
            }
            // Đảm bảo applications.status có giá trị 'awaiting_verification'
            try
            {
                var appConn = context.Database.GetDbConnection();
                var appWasOpen = appConn.State == System.Data.ConnectionState.Open;
                if (!appWasOpen) await appConn.OpenAsync();
                string? columnType = null;
                try
                {
                    using var cmd = appConn.CreateCommand();
                    cmd.CommandText = @"
                        SELECT COLUMN_TYPE 
                        FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'applications' AND COLUMN_NAME = 'status';";
                    var res = await cmd.ExecuteScalarAsync();
                    columnType = res?.ToString();
                }
                finally
                {
                    if (!appWasOpen) await appConn.CloseAsync();
                }

                if (columnType != null && !columnType.Contains("awaiting_verification", StringComparison.OrdinalIgnoreCase))
                {
                    await context.Database.ExecuteSqlRawAsync(@"
                        ALTER TABLE `applications` MODIFY COLUMN `status` ENUM('pending','hired','submitted','completed','rejected','cancelled','awaiting_verification') NOT NULL DEFAULT 'pending';
                    ");
                    logger?.LogInformation("DbInitializer: Đã mở rộng ENUM status bảng applications với 'awaiting_verification'.");
                }
            }
            catch (Exception ex)
            {
                logger?.LogWarning(ex, "DbInitializer: Không thể cập nhật ENUM status bảng applications.");
            }
        }
        catch (Exception ex)
        {
            logger?.LogWarning(ex, "DbInitializer: Lỗi kiểm tra schema cột mở rộng của bảng users.");
        }
    }

    public static async Task EnsureSubscriptionPlansSchemaAndSeedAsync(SkillBridgeDbContext context, ILogger? logger = null)
    {
        try
        {
            // 1. Tạo bảng nếu chưa tồn tại
            await context.Database.ExecuteSqlRawAsync(@"
                CREATE TABLE IF NOT EXISTS `subscription_plan_configs` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `code` VARCHAR(50) NOT NULL UNIQUE,
                    `target_role` VARCHAR(20) NOT NULL,
                    `name` VARCHAR(100) NOT NULL,
                    `tagline` VARCHAR(255) NULL,
                    `badge_text` VARCHAR(50) NULL,
                    `price` DECIMAL(12, 2) NOT NULL DEFAULT 0,
                    `price_sub` VARCHAR(100) NULL,
                    `commission_rate` DECIMAL(5, 4) NOT NULL,
                    `tier_rank` INT NOT NULL DEFAULT 0,
                    `max_active_jobs` INT NULL,
                    `max_weekly_applications` INT NULL,
                    `max_cv_files` INT NOT NULL DEFAULT 5,
                    `default_revision_limit` INT NOT NULL DEFAULT 2,
                    `free_featured_pins` INT NOT NULL DEFAULT 0,
                    `free_direct_invites` INT NOT NULL DEFAULT 0,
                    `features_json` TEXT NOT NULL,
                    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                    `is_popular` TINYINT(1) NOT NULL DEFAULT 0,
                    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ");

            // 2. Kiểm tra nếu chưa có dữ liệu thì nạp sẵn 8 gói chuẩn
            var count = await context.SubscriptionPlanConfigs.CountAsync();
            if (count == 0)
            {
                var seedPlans = new List<SubscriptionPlanConfig>
                {
                    // === SINH VIÊN ===
                    new SubscriptionPlanConfig
                    {
                        Code = "FREE_STUDENT",
                        TargetRole = "student",
                        Name = "Sinh Viên Cơ Bản",
                        Tagline = "Khởi đầu không rủi ro",
                        BadgeText = "Miễn phí",
                        Price = 0,
                        PriceSub = "Dành cho người mới",
                        CommissionRate = 0.1000m,
                        TierRank = 0,
                        MaxWeeklyApplications = 5,
                        MaxCvFiles = 1,
                        DefaultRevisionLimit = 2,
                        FreeFeaturedPins = 0,
                        FreeDirectInvites = 0,
                        FeaturesJson = "[\"Phí sàn tiêu chuẩn: 10%\", \"5 đơn ứng tuyển / tuần\", \"Hồ sơ 1 bản CV cơ bản\", \"Bảo vệ quỹ tương hỗ an toàn\", \"Rút tiền tiêu chuẩn 24 – 48h\"]",
                        IsActive = true,
                        IsPopular = false
                    },
                    new SubscriptionPlanConfig
                    {
                        Code = "STU_STARTER",
                        TargetRole = "student",
                        Name = "Sinh Viên Tích Cực",
                        Tagline = "Gấp 3 cơ hội nhận việc",
                        BadgeText = "Khởi đầu",
                        Price = 29000,
                        PriceSub = "Chỉ 1.000đ / ngày",
                        CommissionRate = 0.0800m,
                        TierRank = 1,
                        MaxWeeklyApplications = 15,
                        MaxCvFiles = 3,
                        DefaultRevisionLimit = 2,
                        FreeFeaturedPins = 0,
                        FreeDirectInvites = 0,
                        FeaturesJson = "[\"Phí sàn giảm còn 8% (tiết kiệm ngay)\", \"15 đơn nộp hồ sơ / tuần\", \"Quản lý 3 CV chuyên ngành\", \"Huy hiệu Tích Cực\", \"Rút tiền ưu tiên trong 12h\"]",
                        IsActive = true,
                        IsPopular = false
                    },
                    new SubscriptionPlanConfig
                    {
                        Code = "STU_PRO",
                        TargetRole = "student",
                        Name = "Freelance Pro",
                        Tagline = "Lựa chọn bứt phá thu nhập",
                        BadgeText = "Phổ biến",
                        Price = 49000,
                        PriceSub = "Tiết kiệm 50% phí sàn",
                        CommissionRate = 0.0500m,
                        TierRank = 2,
                        MaxWeeklyApplications = null, // Vô hạn
                        MaxCvFiles = 5,
                        DefaultRevisionLimit = 2,
                        FreeFeaturedPins = 0,
                        FreeDirectInvites = 0,
                        FeaturesJson = "[\"Phí sàn siêu ưu đãi chỉ 5%\", \"Không giới hạn lượt nộp hồ sơ\", \"Ưu tiên Top 50% danh sách ứng viên\", \"Huy hiệu PRO\", \"Rút tiền siêu tốc trong 1 – 2h\"]",
                        IsActive = true,
                        IsPopular = true
                    },
                    new SubscriptionPlanConfig
                    {
                        Code = "STU_MASTER",
                        TargetRole = "student",
                        Name = "Master Talent",
                        Tagline = "Thu nhập tối đa · Đặc quyền VIP",
                        BadgeText = "VIP",
                        Price = 99000,
                        PriceSub = "Thu hồi vốn sau 1 dự án",
                        CommissionRate = 0.0300m,
                        TierRank = 3,
                        MaxWeeklyApplications = null, // Vô hạn
                        MaxCvFiles = 5,
                        DefaultRevisionLimit = 2,
                        FreeFeaturedPins = 0,
                        FreeDirectInvites = 0,
                        FeaturesJson = "[\"Phí sàn thấp nhất: Duy nhất 3%\", \"Ghim đơn Top 1 có viền sáng hút mắt\", \"Huy hiệu VIP Talent\", \"Đặc quyền ưu tiên phỏng vấn\", \"Rút tiền tức thì 24/7 (5 – 15 phút)\"]",
                        IsActive = true,
                        IsPopular = false
                    },

                    // === NHÀ TUYỂN DỤNG ===
                    new SubscriptionPlanConfig
                    {
                        Code = "FREE_EMPLOYER",
                        TargetRole = "employer",
                        Name = "NTD Cơ Bản",
                        Tagline = "Tuyển dụng an toàn 100%",
                        BadgeText = "Miễn phí",
                        Price = 0,
                        PriceSub = "Cho nhu cầu tuyển việc lẻ",
                        CommissionRate = 0.1000m,
                        TierRank = 0,
                        MaxActiveJobs = 1,
                        DefaultRevisionLimit = 2,
                        FreeFeaturedPins = 0,
                        FreeDirectInvites = 0,
                        FeaturesJson = "[\"01 tin tuyển dụng chạy đồng thời\", \"Tối đa 2 lần yêu cầu chỉnh sửa\", \"Ký quỹ Escrow an toàn 100%\", \"Nghiệm thu 0đ phí sàn\", \"Hỗ trợ tranh chấp cơ bản\"]",
                        IsActive = true,
                        IsPopular = false
                    },
                    new SubscriptionPlanConfig
                    {
                        Code = "EMP_STARTER",
                        TargetRole = "employer",
                        Name = "Tuyển Dụng Nhanh",
                        Tagline = "Tăng tốc chốt nhân sự",
                        BadgeText = "Tuyển nhanh",
                        Price = 49000,
                        PriceSub = "Dành cho Shop & Cá nhân",
                        CommissionRate = 0.1000m,
                        TierRank = 1,
                        MaxActiveJobs = 3,
                        DefaultRevisionLimit = 3,
                        FreeFeaturedPins = 1,
                        FreeDirectInvites = 0,
                        FeaturesJson = "[\"Tối đa 3 tin tuyển dụng đồng thời\", \"Tặng 1 lượt Ghim tin Hot (48h)\", \"Huy hiệu Đã xác thực\", \"Tăng lên 3 lần yêu cầu sửa bài\", \"Báo ứng viên mới tức thì qua App\"]",
                        IsActive = true,
                        IsPopular = false
                    },
                    new SubscriptionPlanConfig
                    {
                        Code = "EMP_GROWTH",
                        TargetRole = "employer",
                        Name = "Doanh Nghiệp Tiêu Chuẩn",
                        Tagline = "Chủ động săn sinh viên giỏi",
                        BadgeText = "Tăng trưởng",
                        Price = 89000,
                        PriceSub = "Cho Startup & Agency",
                        CommissionRate = 0.1000m,
                        TierRank = 2,
                        MaxActiveJobs = 7,
                        DefaultRevisionLimit = 4,
                        FreeFeaturedPins = 3,
                        FreeDirectInvites = 10,
                        FeaturesJson = "[\"Tối đa 7 tin tuyển dụng đồng thời\", \"Tặng 3 lượt Ghim tin nổi bật\", \"Mở khóa Danh bạ Sinh viên\", \"Tặng 10 lượt mời làm việc trực tiếp\", \"Sửa bài 4 lần · Hỗ trợ ưu tiên trong 12h\"]",
                        IsActive = true,
                        IsPopular = false
                    },
                    new SubscriptionPlanConfig
                    {
                        Code = "EMP_VIP",
                        TargetRole = "employer",
                        Name = "VIP Business Suite",
                        Tagline = "Đặc quyền hút nhân tài số 1",
                        BadgeText = "Khuyên dùng",
                        Price = 149000,
                        PriceSub = "Giải pháp tuyển dụng VIP",
                        CommissionRate = 0.0500m, // SV làm cho VIP chỉ chịu 5%
                        TierRank = 3,
                        MaxActiveJobs = null, // Vô hạn
                        DefaultRevisionLimit = 5,
                        FreeFeaturedPins = 5,
                        FreeDirectInvites = 25,
                        FeaturesJson = "[\"Đăng tin KHÔNG GIỚI HẠN\", \"Tặng 5 Ghim Hot + nhãn Tuyển Gấp\", \"SV làm việc chỉ chịu 5% phí sàn\", \"Tặng 25 lượt mời ứng viên VIP\", \"Huy hiệu VIP\"]",
                        IsActive = true,
                        IsPopular = true
                    }
                };

                await context.SubscriptionPlanConfigs.AddRangeAsync(seedPlans);
                await context.SaveChangesAsync();
                logger?.LogInformation("DbInitializer: Đã khởi tạo thành công 8 gói cấu hình SubscriptionPlanConfig mặc định.");
            }
        }
        catch (Exception ex)
        {
            logger?.LogWarning(ex, "DbInitializer: Lỗi cập nhật schema bảng subscription_plan_configs.");
        }
    }

    public static async Task EnsureStudentVerificationSchemaAsync(SkillBridgeDbContext context, ILogger? logger = null)
    {
        try
        {
            await context.Database.ExecuteSqlRawAsync(@"
                SET @dbname = DATABASE();

                -- 1. wallets.withdraw_hold_reason
                SET @tablename = 'wallets';
                SET @col = 'withdraw_hold_reason';
                SET @sql = (SELECT IF(
                    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col) > 0,
                    'SELECT 1',
                    'ALTER TABLE wallets ADD COLUMN withdraw_hold_reason VARCHAR(100) NULL DEFAULT NULL'
                ));
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

                -- 1. wallets.withdraw_hold_until
                SET @col = 'withdraw_hold_until';
                SET @sql = (SELECT IF(
                    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col) > 0,
                    'SELECT 1',
                    'ALTER TABLE wallets ADD COLUMN withdraw_hold_until DATETIME NULL DEFAULT NULL'
                ));
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

                -- 2. identity_documents.verification_request_id
                SET @tablename = 'identity_documents';
                SET @col = 'verification_request_id';
                SET @sql = (SELECT IF(
                    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col) > 0,
                    'SELECT 1',
                    'ALTER TABLE identity_documents ADD COLUMN verification_request_id INT NULL DEFAULT NULL'
                ));
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

                -- 2. identity_documents.side
                SET @col = 'side';
                SET @sql = (SELECT IF(
                    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col) > 0,
                    'SELECT 1',
                    'ALTER TABLE identity_documents ADD COLUMN side VARCHAR(10) NULL DEFAULT NULL'
                ));
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

                -- 2. identity_documents.file_sha256
                SET @col = 'file_sha256';
                SET @sql = (SELECT IF(
                    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col) > 0,
                    'SELECT 1',
                    'ALTER TABLE identity_documents ADD COLUMN file_sha256 VARCHAR(64) NULL DEFAULT NULL'
                ));
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

                -- 2. identity_documents.purge_after
                SET @col = 'purge_after';
                SET @sql = (SELECT IF(
                    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col) > 0,
                    'SELECT 1',
                    'ALTER TABLE identity_documents ADD COLUMN purge_after DATETIME NULL DEFAULT NULL'
                ));
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

                -- 2. identity_documents.purged_at
                SET @col = 'purged_at';
                SET @sql = (SELECT IF(
                    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col) > 0,
                    'SELECT 1',
                    'ALTER TABLE identity_documents ADD COLUMN purged_at DATETIME NULL DEFAULT NULL'
                ));
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

                -- 3. schools
                CREATE TABLE IF NOT EXISTS `schools` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `code` VARCHAR(50) NULL,
                    `name` VARCHAR(150) NOT NULL,
                    `short_name` VARCHAR(50) NULL,
                    `domain` VARCHAR(100) NULL,
                    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                -- Đảm bảo các cột short_name, code, domain tồn tại nếu bảng schools đã được tạo trước đó
                SET @tablename = 'schools';
                SET @col = 'short_name';
                SET @sql = (SELECT IF(
                    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col) > 0,
                    'SELECT 1',
                    'ALTER TABLE schools ADD COLUMN short_name VARCHAR(50) NULL DEFAULT NULL AFTER name'
                ));
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

                SET @col = 'code';
                SET @sql = (SELECT IF(
                    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col) > 0,
                    'SELECT 1',
                    'ALTER TABLE schools ADD COLUMN code VARCHAR(50) NULL DEFAULT NULL AFTER id'
                ));
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

                SET @col = 'domain';
                SET @sql = (SELECT IF(
                    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col) > 0,
                    'SELECT 1',
                    'ALTER TABLE schools ADD COLUMN domain VARCHAR(100) NULL DEFAULT NULL AFTER short_name'
                ));
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

                INSERT IGNORE INTO `schools` (`id`, `code`, `name`, `short_name`, `domain`, `is_active`)
                VALUES (1, 'FPT_UNIVERSITY', 'Đại học FPT', 'FPTU', 'fpt.edu.vn', 1);
                UPDATE `schools` SET `short_name` = 'FPTU' WHERE `id` = 1 AND (`short_name` IS NULL OR `short_name` = '');

                -- 4. student_verification_requests
                CREATE TABLE IF NOT EXISTS `student_verification_requests` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `user_id` INT NOT NULL,
                    `request_type` VARCHAR(30) NOT NULL DEFAULT 'initial',
                    `status` VARCHAR(30) NOT NULL DEFAULT 'pending',
                    `school_id` INT NOT NULL,
                    `student_code` VARCHAR(50) NOT NULL,
                    `student_code_normalized` VARCHAR(50) NOT NULL,
                    `full_name_on_card` VARCHAR(150) NOT NULL,
                    `graduation_year` SMALLINT NOT NULL,
                    `ocr_result_json` JSON NULL,
                    `risk_flags_json` JSON NULL,
                    `reason_code` VARCHAR(50) NULL,
                    `user_message` TEXT NULL,
                    `rejection_reason` TEXT NULL,
                    `admin_note` TEXT NULL,
                    `need_info_deadline` DATETIME NULL,
                    `resubmit_allowed` TINYINT(1) NOT NULL DEFAULT 1,
                    `resubmit_after` DATETIME NULL,
                    `submitted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    `reviewed_by_admin_id` INT NULL,
                    `reviewed_at` DATETIME NULL,
                    `PendingUserId` INT GENERATED ALWAYS AS (CASE WHEN `status` = 'pending' THEN `user_id` ELSE NULL END) VIRTUAL,
                    KEY `idx_svr_user` (`user_id`),
                    KEY `idx_svr_school_code` (`school_id`, `student_code_normalized`),
                    KEY `idx_svr_status_submitted` (`status`, `submitted_at`),
                    UNIQUE KEY `uq_svr_pending_user` (`PendingUserId`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                -- Đảm bảo PendingUserId và uq_svr_pending_user nếu bảng đã tạo trước đó
                SET @tablename = 'student_verification_requests';
                SET @col = 'PendingUserId';
                SET @sql = (SELECT IF(
                    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col) > 0,
                    'SELECT 1',
                    'ALTER TABLE student_verification_requests ADD COLUMN PendingUserId INT GENERATED ALWAYS AS (CASE WHEN `status` = ''pending'' THEN `user_id` ELSE NULL END) VIRTUAL'
                ));
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

                SET @idx = 'uq_svr_pending_user';
                SET @sql = (SELECT IF(
                    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND INDEX_NAME = @idx) > 0,
                    'SELECT 1',
                    'ALTER TABLE student_verification_requests ADD UNIQUE KEY uq_svr_pending_user (PendingUserId)'
                ));
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

                -- 5. student_profiles
                CREATE TABLE IF NOT EXISTS `student_profiles` (
                    `user_id` INT PRIMARY KEY,
                    `school_id` INT NOT NULL,
                    `student_code` VARCHAR(50) NOT NULL,
                    `student_code_normalized` VARCHAR(50) NOT NULL,
                    `verified_full_name` VARCHAR(150) NOT NULL,
                    `graduation_year` SMALLINT NOT NULL,
                    `verified_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    `expires_at` DATETIME NULL,
                    `source_request_id` INT NOT NULL,
                    UNIQUE KEY `uq_student_profiles_school_code` (`school_id`, `student_code_normalized`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                SET @tablename = 'student_profiles';
                SET @idx = 'uq_student_profiles_school_code';
                SET @sql = (SELECT IF(
                    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND INDEX_NAME = @idx) > 0,
                    'SELECT 1',
                    'ALTER TABLE student_profiles ADD UNIQUE KEY uq_student_profiles_school_code (school_id, student_code_normalized)'
                ));
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

                -- 6. external_logins
                CREATE TABLE IF NOT EXISTS `external_logins` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `user_id` INT NOT NULL,
                    `provider` VARCHAR(30) NOT NULL,
                    `provider_user_id` VARCHAR(100) NOT NULL,
                    `provider_email` VARCHAR(150) NULL,
                    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    KEY `idx_el_user` (`user_id`),
                    UNIQUE KEY `uq_provider_uid` (`provider`, `provider_user_id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                -- 7. users: school_id, student_code, graduation_year
                SET @tablename = 'users';
                SET @col = 'school_id';
                SET @sql = (SELECT IF(
                    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col) > 0,
                    'SELECT 1',
                    'ALTER TABLE users ADD COLUMN school_id INT NULL DEFAULT NULL AFTER school'
                ));
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

                SET @col = 'student_code';
                SET @sql = (SELECT IF(
                    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col) > 0,
                    'SELECT 1',
                    'ALTER TABLE users ADD COLUMN student_code VARCHAR(50) NULL DEFAULT NULL AFTER school_id'
                ));
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

                SET @col = 'graduation_year';
                SET @sql = (SELECT IF(
                    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col) > 0,
                    'SELECT 1',
                    'ALTER TABLE users ADD COLUMN graduation_year SMALLINT NULL DEFAULT NULL AFTER student_code'
                ));
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
            ");
            logger?.LogInformation("DbInitializer: Đã đảm bảo schema xác minh sinh viên và ví cập nhật đầy đủ.");
        }
        catch (Exception ex)
        {
            logger?.LogWarning(ex, "DbInitializer: Lỗi cập nhật schema bảng xác minh sinh viên.");
        }
    }
}
