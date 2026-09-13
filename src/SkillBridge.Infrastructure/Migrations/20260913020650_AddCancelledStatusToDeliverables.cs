using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkillBridge.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCancelledStatusToDeliverables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_receipts_job",
                table: "receipts");

            migrationBuilder.AlterColumn<string>(
                name: "status",
                table: "job_deliverables",
                type: "enum('submitted','revision_requested','accepted','cancelled')",
                nullable: false,
                defaultValueSql: "'submitted'",
                collation: "utf8mb4_unicode_ci",
                oldClrType: typeof(string),
                oldType: "enum('submitted','revision_requested','accepted')",
                oldDefaultValueSql: "'submitted'")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("Relational:Collation", "utf8mb4_unicode_ci");

            migrationBuilder.AddForeignKey(
                name: "fk_receipts_job",
                table: "receipts",
                column: "job_id",
                principalTable: "jobs",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_receipts_job",
                table: "receipts");

            migrationBuilder.AlterColumn<string>(
                name: "status",
                table: "job_deliverables",
                type: "enum('submitted','revision_requested','accepted')",
                nullable: false,
                defaultValueSql: "'submitted'",
                collation: "utf8mb4_unicode_ci",
                oldClrType: typeof(string),
                oldType: "enum('submitted','revision_requested','accepted','cancelled')",
                oldDefaultValueSql: "'submitted'")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("Relational:Collation", "utf8mb4_unicode_ci");

            migrationBuilder.AddForeignKey(
                name: "fk_receipts_job",
                table: "receipts",
                column: "job_id",
                principalTable: "jobs",
                principalColumn: "id");
        }
    }
}
