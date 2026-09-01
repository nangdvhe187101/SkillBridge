using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkillBridge.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDeliverableVersionUniqueIndexAndJobFullText : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                SET @dbname = DATABASE();
                SET @tablename = 'jobs';
                SET @indexname = 'idx_jobs_fulltext';
                SET @preparedStatement = (SELECT IF(
                    (
                        SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
                        WHERE TABLE_SCHEMA = @dbname
                        AND TABLE_NAME = @tablename
                        AND INDEX_NAME = @indexname
                    ) > 0,
                    'SELECT 1',
                    'CREATE FULLTEXT INDEX idx_jobs_fulltext ON jobs (title, description)'
                ));
                PREPARE stmt FROM @preparedStatement;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;

                SET @tablename = 'job_deliverables';
                SET @indexname = 'uq_deliverables_job_version';
                SET @preparedStatement = (SELECT IF(
                    (
                        SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
                        WHERE TABLE_SCHEMA = @dbname
                        AND TABLE_NAME = @tablename
                        AND INDEX_NAME = @indexname
                    ) > 0,
                    'SELECT 1',
                    'CREATE UNIQUE INDEX uq_deliverables_job_version ON job_deliverables (job_id, version)'
                ));
                PREPARE stmt FROM @preparedStatement;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                SET @dbname = DATABASE();
                SET @tablename = 'jobs';
                SET @indexname = 'idx_jobs_fulltext';
                SET @preparedStatement = (SELECT IF(
                    (
                        SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
                        WHERE TABLE_SCHEMA = @dbname
                        AND TABLE_NAME = @tablename
                        AND INDEX_NAME = @indexname
                    ) > 0,
                    'DROP INDEX idx_jobs_fulltext ON jobs',
                    'SELECT 1'
                ));
                PREPARE stmt FROM @preparedStatement;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;

                SET @tablename = 'job_deliverables';
                SET @indexname = 'uq_deliverables_job_version';
                SET @preparedStatement = (SELECT IF(
                    (
                        SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
                        WHERE TABLE_SCHEMA = @dbname
                        AND TABLE_NAME = @tablename
                        AND INDEX_NAME = @indexname
                    ) > 0,
                    'DROP INDEX uq_deliverables_job_version ON job_deliverables',
                    'SELECT 1'
                ));
                PREPARE stmt FROM @preparedStatement;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            ");
        }
    }
}
