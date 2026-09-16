using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkillBridge.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueConstraintToReceiptJobId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                SET @idx_count = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'receipts' AND index_name = 'uq_receipts_job');
                SET @sql_cmd = IF(@idx_count = 0, 'CREATE UNIQUE INDEX `uq_receipts_job` ON `receipts` (`job_id`)', 'SELECT 1');
                PREPARE stmt FROM @sql_cmd;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            ");

            migrationBuilder.Sql(@"
                SET @idx_count = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'receipts' AND index_name = 'fk_receipts_job');
                SET @sql_cmd = IF(@idx_count > 0, 'ALTER TABLE `receipts` DROP INDEX `fk_receipts_job`', 'SELECT 1');
                PREPARE stmt FROM @sql_cmd;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "fk_receipts_job",
                table: "receipts",
                column: "job_id");

            migrationBuilder.DropIndex(
                name: "uq_receipts_job",
                table: "receipts");
        }
    }
}
