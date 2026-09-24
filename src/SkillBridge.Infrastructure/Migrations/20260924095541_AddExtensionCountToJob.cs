using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkillBridge.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddExtensionCountToJob : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "extension_count",
                table: "jobs",
                type: "int",
                nullable: false,
                defaultValueSql: "'0'");

            migrationBuilder.CreateTable(
                name: "job_deadline_extensions",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    job_id = table.Column<int>(type: "int", nullable: false),
                    student_id = table.Column<int>(type: "int", nullable: false),
                    additional_days = table.Column<int>(type: "int", nullable: false),
                    current_deadline = table.Column<DateTime>(type: "datetime", nullable: false),
                    proposed_deadline = table.Column<DateTime>(type: "datetime", nullable: false),
                    reason_category = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    detail_reason = table.Column<string>(type: "text", nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    status = table.Column<string>(type: "enum('pending','accepted','rejected','cancelled')", nullable: false, defaultValueSql: "'pending'", collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    rejection_reason = table.Column<string>(type: "text", nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    requested_at = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    responded_at = table.Column<DateTime>(type: "datetime", nullable: true),
                    responded_by_user_id = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.id);
                    table.ForeignKey(
                        name: "fk_job_deadline_extensions_job",
                        column: x => x.job_id,
                        principalTable: "jobs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_job_deadline_extensions_responder",
                        column: x => x.responded_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_job_deadline_extensions_student",
                        column: x => x.student_id,
                        principalTable: "users",
                        principalColumn: "id");
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_unicode_ci");

            migrationBuilder.CreateIndex(
                name: "fk_job_deadline_extensions_student",
                table: "job_deadline_extensions",
                column: "student_id");

            migrationBuilder.CreateIndex(
                name: "idx_job_deadline_extensions_job_status",
                table: "job_deadline_extensions",
                columns: new[] { "job_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_job_deadline_extensions_responded_by_user_id",
                table: "job_deadline_extensions",
                column: "responded_by_user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "job_deadline_extensions");

            migrationBuilder.DropColumn(
                name: "extension_count",
                table: "jobs");
        }
    }
}
