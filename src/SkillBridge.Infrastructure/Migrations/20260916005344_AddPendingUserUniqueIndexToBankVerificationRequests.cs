using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkillBridge.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPendingUserUniqueIndexToBankVerificationRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "PendingUserId",
                table: "bank_verification_requests",
                type: "int",
                nullable: true,
                computedColumnSql: "CASE WHEN `status` = 'Pending' THEN `user_id` ELSE NULL END",
                stored: false);

            migrationBuilder.CreateIndex(
                name: "uq_bank_verif_pending_user",
                table: "bank_verification_requests",
                column: "PendingUserId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "uq_bank_verif_pending_user",
                table: "bank_verification_requests");

            migrationBuilder.DropColumn(
                name: "PendingUserId",
                table: "bank_verification_requests");
        }
    }
}
