using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkillBridge.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCriticalIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "withdraw_hold_reason",
                table: "wallets",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true,
                collation: "utf8mb4_unicode_ci")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "withdraw_hold_until",
                table: "wallets",
                type: "datetime",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "address",
                table: "users",
                type: "varchar(255)",
                maxLength: 255,
                nullable: true,
                collation: "utf8mb4_unicode_ci")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "benefits_json",
                table: "users",
                type: "text",
                nullable: true,
                collation: "utf8mb4_unicode_ci")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "bio",
                table: "users",
                type: "text",
                nullable: true,
                collation: "utf8mb4_unicode_ci")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "cover_image_url",
                table: "users",
                type: "varchar(500)",
                maxLength: 500,
                nullable: true,
                collation: "utf8mb4_unicode_ci")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "education_json",
                table: "users",
                type: "text",
                nullable: true,
                collation: "utf8mb4_unicode_ci")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<decimal>(
                name: "expected_hourly_rate",
                table: "users",
                type: "decimal(12,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "experience_json",
                table: "users",
                type: "text",
                nullable: true,
                collation: "utf8mb4_unicode_ci")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<short>(
                name: "graduation_year",
                table: "users",
                type: "smallint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "headline",
                table: "users",
                type: "varchar(255)",
                maxLength: 255,
                nullable: true,
                collation: "utf8mb4_unicode_ci")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "office_images_json",
                table: "users",
                type: "text",
                nullable: true,
                collation: "utf8mb4_unicode_ci")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "representative",
                table: "users",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true,
                collation: "utf8mb4_unicode_ci")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "school_id",
                table: "users",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "skills_json",
                table: "users",
                type: "text",
                nullable: true,
                collation: "utf8mb4_unicode_ci")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "social_links_json",
                table: "users",
                type: "text",
                nullable: true,
                collation: "utf8mb4_unicode_ci")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "student_code",
                table: "users",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true,
                collation: "utf8mb4_unicode_ci")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "tax_code",
                table: "users",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true,
                collation: "utf8mb4_unicode_ci")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "file_sha256",
                table: "identity_documents",
                type: "varchar(64)",
                maxLength: 64,
                nullable: true,
                collation: "utf8mb4_unicode_ci")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "purge_after",
                table: "identity_documents",
                type: "datetime",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "purged_at",
                table: "identity_documents",
                type: "datetime",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "side",
                table: "identity_documents",
                type: "varchar(10)",
                maxLength: 10,
                nullable: true,
                collation: "utf8mb4_unicode_ci")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "verification_request_id",
                table: "identity_documents",
                type: "int",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "status",
                table: "applications",
                type: "enum('pending','hired','submitted','completed','rejected','cancelled','awaiting_verification')",
                nullable: false,
                defaultValueSql: "'pending'",
                collation: "utf8mb4_unicode_ci",
                oldClrType: typeof(string),
                oldType: "enum('pending','hired','submitted','completed','rejected','cancelled')",
                oldDefaultValueSql: "'pending'")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("Relational:Collation", "utf8mb4_unicode_ci");

            migrationBuilder.CreateTable(
                name: "external_logins",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    user_id = table.Column<int>(type: "int", nullable: false),
                    provider = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    provider_user_id = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    provider_email = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.id);
                    table.ForeignKey(
                        name: "fk_extlogin_user",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_unicode_ci");

            migrationBuilder.CreateTable(
                name: "schools",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    code = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    name = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    short_name = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    domain = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.id);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_unicode_ci");

            migrationBuilder.CreateTable(
                name: "subscription_plan_configs",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    code = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    target_role = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    tagline = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    badge_text = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    price = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    price_sub = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    commission_rate = table.Column<decimal>(type: "decimal(5,4)", nullable: false),
                    tier_rank = table.Column<int>(type: "int", nullable: false),
                    max_active_jobs = table.Column<int>(type: "int", nullable: true),
                    max_weekly_applications = table.Column<int>(type: "int", nullable: true),
                    max_cv_files = table.Column<int>(type: "int", nullable: false),
                    default_revision_limit = table.Column<int>(type: "int", nullable: false),
                    free_featured_pins = table.Column<int>(type: "int", nullable: false),
                    free_direct_invites = table.Column<int>(type: "int", nullable: false),
                    features_json = table.Column<string>(type: "text", nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    is_popular = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_subscription_plan_configs", x => x.id);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_unicode_ci");

            migrationBuilder.CreateTable(
                name: "student_verification_requests",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    user_id = table.Column<int>(type: "int", nullable: false),
                    request_type = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    status = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    school_id = table.Column<int>(type: "int", nullable: false),
                    student_code = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    student_code_normalized = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    full_name_on_card = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    graduation_year = table.Column<short>(type: "smallint", nullable: false),
                    ocr_result_json = table.Column<string>(type: "json", nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    risk_flags_json = table.Column<string>(type: "json", nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    reason_code = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    user_message = table.Column<string>(type: "text", nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    rejection_reason = table.Column<string>(type: "text", nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    admin_note = table.Column<string>(type: "text", nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    need_info_deadline = table.Column<DateTime>(type: "datetime", nullable: true),
                    resubmit_allowed = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    resubmit_after = table.Column<DateTime>(type: "datetime", nullable: true),
                    submitted_at = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    reviewed_by_admin_id = table.Column<int>(type: "int", nullable: true),
                    reviewed_at = table.Column<DateTime>(type: "datetime", nullable: true),
                    PendingUserId = table.Column<int>(type: "int", nullable: true, computedColumnSql: "CASE WHEN `status` = 'pending' THEN `user_id` ELSE NULL END", stored: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.id);
                    table.ForeignKey(
                        name: "fk_svr_reviewer",
                        column: x => x.reviewed_by_admin_id,
                        principalTable: "admin_team_members",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_svr_school",
                        column: x => x.school_id,
                        principalTable: "schools",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_svr_user",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id");
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_unicode_ci");

            migrationBuilder.CreateTable(
                name: "student_profiles",
                columns: table => new
                {
                    user_id = table.Column<int>(type: "int", nullable: false),
                    school_id = table.Column<int>(type: "int", nullable: false),
                    student_code = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    student_code_normalized = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    verified_full_name = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    graduation_year = table.Column<short>(type: "smallint", nullable: false),
                    verified_at = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    expires_at = table.Column<DateTime>(type: "datetime", nullable: true),
                    source_request_id = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.user_id);
                    table.ForeignKey(
                        name: "fk_sp_request",
                        column: x => x.source_request_id,
                        principalTable: "student_verification_requests",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_sp_school",
                        column: x => x.school_id,
                        principalTable: "schools",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_sp_user",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_unicode_ci");

            migrationBuilder.CreateIndex(
                name: "IX_identity_documents_verification_request_id",
                table: "identity_documents",
                column: "verification_request_id");

            migrationBuilder.CreateIndex(
                name: "IX_external_logins_user_id",
                table: "external_logins",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "uq_external_login",
                table: "external_logins",
                columns: new[] { "provider", "provider_user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "uq_schools_name",
                table: "schools",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_student_profiles_source_request_id",
                table: "student_profiles",
                column: "source_request_id");

            migrationBuilder.CreateIndex(
                name: "uq_student_profiles_school_code",
                table: "student_profiles",
                columns: new[] { "school_id", "student_code_normalized" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_svr_school_code",
                table: "student_verification_requests",
                columns: new[] { "school_id", "student_code_normalized" });

            migrationBuilder.CreateIndex(
                name: "idx_svr_status_submitted",
                table: "student_verification_requests",
                columns: new[] { "status", "submitted_at" });

            migrationBuilder.CreateIndex(
                name: "IX_student_verification_requests_reviewed_by_admin_id",
                table: "student_verification_requests",
                column: "reviewed_by_admin_id");

            migrationBuilder.CreateIndex(
                name: "IX_student_verification_requests_user_id",
                table: "student_verification_requests",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "uq_svr_pending_user",
                table: "student_verification_requests",
                column: "PendingUserId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_identity_documents_student_verification_requests_verificatio~",
                table: "identity_documents",
                column: "verification_request_id",
                principalTable: "student_verification_requests",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_identity_documents_student_verification_requests_verificatio~",
                table: "identity_documents");

            migrationBuilder.DropTable(
                name: "external_logins");

            migrationBuilder.DropTable(
                name: "student_profiles");

            migrationBuilder.DropTable(
                name: "subscription_plan_configs");

            migrationBuilder.DropTable(
                name: "student_verification_requests");

            migrationBuilder.DropTable(
                name: "schools");

            migrationBuilder.DropIndex(
                name: "IX_identity_documents_verification_request_id",
                table: "identity_documents");

            migrationBuilder.DropColumn(
                name: "withdraw_hold_reason",
                table: "wallets");

            migrationBuilder.DropColumn(
                name: "withdraw_hold_until",
                table: "wallets");

            migrationBuilder.DropColumn(
                name: "address",
                table: "users");

            migrationBuilder.DropColumn(
                name: "benefits_json",
                table: "users");

            migrationBuilder.DropColumn(
                name: "bio",
                table: "users");

            migrationBuilder.DropColumn(
                name: "cover_image_url",
                table: "users");

            migrationBuilder.DropColumn(
                name: "education_json",
                table: "users");

            migrationBuilder.DropColumn(
                name: "expected_hourly_rate",
                table: "users");

            migrationBuilder.DropColumn(
                name: "experience_json",
                table: "users");

            migrationBuilder.DropColumn(
                name: "graduation_year",
                table: "users");

            migrationBuilder.DropColumn(
                name: "headline",
                table: "users");

            migrationBuilder.DropColumn(
                name: "office_images_json",
                table: "users");

            migrationBuilder.DropColumn(
                name: "representative",
                table: "users");

            migrationBuilder.DropColumn(
                name: "school_id",
                table: "users");

            migrationBuilder.DropColumn(
                name: "skills_json",
                table: "users");

            migrationBuilder.DropColumn(
                name: "social_links_json",
                table: "users");

            migrationBuilder.DropColumn(
                name: "student_code",
                table: "users");

            migrationBuilder.DropColumn(
                name: "tax_code",
                table: "users");

            migrationBuilder.DropColumn(
                name: "file_sha256",
                table: "identity_documents");

            migrationBuilder.DropColumn(
                name: "purge_after",
                table: "identity_documents");

            migrationBuilder.DropColumn(
                name: "purged_at",
                table: "identity_documents");

            migrationBuilder.DropColumn(
                name: "side",
                table: "identity_documents");

            migrationBuilder.DropColumn(
                name: "verification_request_id",
                table: "identity_documents");

            migrationBuilder.AlterColumn<string>(
                name: "status",
                table: "applications",
                type: "enum('pending','hired','submitted','completed','rejected','cancelled')",
                nullable: false,
                defaultValueSql: "'pending'",
                collation: "utf8mb4_unicode_ci",
                oldClrType: typeof(string),
                oldType: "enum('pending','hired','submitted','completed','rejected','cancelled','awaiting_verification')",
                oldDefaultValueSql: "'pending'")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("Relational:Collation", "utf8mb4_unicode_ci");
        }
    }
}
