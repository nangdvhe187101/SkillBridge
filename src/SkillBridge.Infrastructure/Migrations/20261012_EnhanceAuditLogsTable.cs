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
            // Rename old audit_log table to audit_logs if needed and ensure new structure
            migrationBuilder.Sql(@"
                ALTER TABLE `audit_log`
                RENAME TO `audit_logs`;
            ", suppressTransaction: true);

            // Add new columns if they don't exist
            migrationBuilder.Sql(@"
                ALTER TABLE `audit_logs`
                ADD COLUMN `user_id` INT NULL AFTER `id`,
                ADD COLUMN `admin_id` INT NULL AFTER `user_id`,
                ADD COLUMN `action` VARCHAR(50) NOT NULL DEFAULT 'AUDIT' AFTER `admin_id`,
                ADD COLUMN `old_value` VARCHAR(255) NULL AFTER `action`,
                ADD COLUMN `new_value` VARCHAR(255) NULL AFTER `old_value`,
                ADD COLUMN `reason` VARCHAR(500) NULL AFTER `new_value`,
                DROP COLUMN IF EXISTS `action_text`,
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
            migrationBuilder.Sql(@"
                ALTER TABLE `audit_logs`
                DROP FOREIGN KEY IF EXISTS `fk_auditlog_user`,
                DROP FOREIGN KEY IF EXISTS `fk_auditlog_admin`,
                DROP INDEX IF EXISTS `idx_auditlog_user`,
                DROP INDEX IF EXISTS `idx_auditlog_admin`,
                DROP COLUMN IF EXISTS `user_id`,
                DROP COLUMN IF EXISTS `admin_id`,
                DROP COLUMN IF EXISTS `action`,
                DROP COLUMN IF EXISTS `old_value`,
                DROP COLUMN IF EXISTS `new_value`,
                DROP COLUMN IF EXISTS `reason`;
            ", suppressTransaction: true);

            migrationBuilder.Sql(@"
                ALTER TABLE `audit_logs`
                RENAME TO `audit_log`;
            ", suppressTransaction: true);
        }
    }
}
