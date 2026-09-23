using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkillBridge.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueIndexConversationPairJob : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Các cột is_archived_user_a/b, is_read_only, read_only_reason,
            // request_initiated_by, request_status và các index tab đã tồn tại trên DB
            // (được thêm thủ công trước migration này) — không AddColumn lại để tránh lỗi.

            // Unique composite index mới ngăn race condition tạo conversation trùng cặp user+job.
            migrationBuilder.CreateIndex(
                name: "uq_conversations_pair_job",
                table: "conversations",
                columns: new[] { "user_a_id", "user_b_id", "job_id" },
                unique: true);

            // FK cho request_initiated_by — nếu FK đã tồn tại, comment dòng này trước khi apply.
            migrationBuilder.AddForeignKey(
                name: "fk_conversations_requester",
                table: "conversations",
                column: "request_initiated_by",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_conversations_requester",
                table: "conversations");

            migrationBuilder.DropIndex(
                name: "uq_conversations_pair_job",
                table: "conversations");
        }
    }
}
