using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkillBridge.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class EnhanceAuditLogsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Rename old audit_log table to audit_logs if needed (idempotent check)
            migrationBuilder.Sql(@"
                SET @table_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
                                    WHERE TABLE_SCHEMA = DATABASE()
                                    AND TABLE_NAME = 'audit_log');
                SET @sql = IF(@table_exists > 0,
                    'ALTER TABLE `audit_log` RENAME TO `audit_logs`',
                    'SELECT 1');
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            ", suppressTransaction: true);

            // Add new columns if they don't exist
            // Note: MySQL doesn't support DROP COLUMN IF EXISTS, so we handle it in two steps
            migrationBuilder.Sql(@"
                ALTER TABLE `audit_logs`
                ADD COLUMN `user_id` INT NULL AFTER `id`,
                ADD COLUMN `admin_id` INT NULL AFTER `user_id`,
                ADD COLUMN `action` VARCHAR(50) NOT NULL DEFAULT 'AUDIT' AFTER `admin_id`,
                ADD COLUMN `old_value` VARCHAR(255) NULL AFTER `action`,
                ADD COLUMN `new_value` VARCHAR(255) NULL AFTER `old_value`,
                ADD COLUMN `reason` VARCHAR(500) NULL AFTER `new_value`;
            ", suppressTransaction: true);

            // Drop action_text if exists (separate statement to handle IF EXISTS)
            migrationBuilder.Sql(@"
                SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                                  WHERE TABLE_SCHEMA = DATABASE()
                                  AND TABLE_NAME = 'audit_logs'
                                  AND COLUMN_NAME = 'action_text');
                SET @sql = IF(@col_exists > 0, 'ALTER TABLE `audit_logs` DROP COLUMN `action_text`', 'SELECT 1');
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            ", suppressTransaction: true);

            // Add action_text back as TEXT
            migrationBuilder.Sql(@"
                ALTER TABLE `audit_logs`
                ADD COLUMN `action_text` TEXT NOT NULL AFTER `reason`;
            ", suppressTransaction: true);

            // Add indexes
            migrationBuilder.Sql(@"
                ALTER TABLE `audit_logs`
                ADD INDEX `idx_auditlog_user` (`user_id`),
                ADD INDEX `idx_auditlog_admin` (`admin_id`);
            ", suppressTransaction: true);

            // Add foreign key constraints
            migrationBuilder.Sql(@"
                ALTER TABLE `audit_logs`
                ADD CONSTRAINT `fk_auditlog_user`
                  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
                ADD CONSTRAINT `fk_auditlog_admin`
                  FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;
            ", suppressTransaction: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop foreign keys
            migrationBuilder.Sql(@"
                ALTER TABLE `audit_logs`
                DROP FOREIGN KEY `fk_auditlog_user`,
                DROP FOREIGN KEY `fk_auditlog_admin`;
            ", suppressTransaction: true);

            // Drop indexes
            migrationBuilder.Sql(@"
                ALTER TABLE `audit_logs`
                DROP INDEX `idx_auditlog_user`,
                DROP INDEX `idx_auditlog_admin`;
            ", suppressTransaction: true);

            // Drop columns
            migrationBuilder.Sql(@"
                ALTER TABLE `audit_logs`
                DROP COLUMN `user_id`,
                DROP COLUMN `admin_id`,
                DROP COLUMN `action`,
                DROP COLUMN `old_value`,
                DROP COLUMN `new_value`,
                DROP COLUMN `reason`,
                DROP COLUMN `action_text`;
            ", suppressTransaction: true);

            migrationBuilder.Sql(@"
                ALTER TABLE `audit_logs`
                RENAME TO `audit_log`;
            ", suppressTransaction: true);
        }
    }
}
