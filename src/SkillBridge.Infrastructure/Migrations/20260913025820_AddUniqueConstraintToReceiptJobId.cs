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
            migrationBuilder.CreateIndex(
                name: "uq_receipts_job",
                table: "receipts",
                column: "job_id",
                unique: true);

            migrationBuilder.DropIndex(
                name: "fk_receipts_job",
                table: "receipts");
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
