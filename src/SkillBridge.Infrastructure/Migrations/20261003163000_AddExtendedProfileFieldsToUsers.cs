using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkillBridge.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddExtendedProfileFieldsToUsers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "headline",
                table: "users",
                type: "varchar(255)",
                maxLength: 255,
                nullable: true,
                collation: "utf8mb4_unicode_ci");

            migrationBuilder.AddColumn<string>(
                name: "bio",
                table: "users",
                type: "text",
                nullable: true,
                collation: "utf8mb4_unicode_ci");

            migrationBuilder.AddColumn<string>(
                name: "tax_code",
                table: "users",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true,
                collation: "utf8mb4_unicode_ci");

            migrationBuilder.AddColumn<string>(
                name: "representative",
                table: "users",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true,
                collation: "utf8mb4_unicode_ci");

            migrationBuilder.AddColumn<string>(
                name: "address",
                table: "users",
                type: "varchar(255)",
                maxLength: 255,
                nullable: true,
                collation: "utf8mb4_unicode_ci");

            migrationBuilder.AddColumn<string>(
                name: "cover_image_url",
                table: "users",
                type: "varchar(500)",
                maxLength: 500,
                nullable: true,
                collation: "utf8mb4_unicode_ci");

            migrationBuilder.AddColumn<string>(
                name: "skills_json",
                table: "users",
                type: "text",
                nullable: true,
                collation: "utf8mb4_unicode_ci");

            migrationBuilder.AddColumn<string>(
                name: "education_json",
                table: "users",
                type: "text",
                nullable: true,
                collation: "utf8mb4_unicode_ci");

            migrationBuilder.AddColumn<string>(
                name: "experience_json",
                table: "users",
                type: "text",
                nullable: true,
                collation: "utf8mb4_unicode_ci");

            migrationBuilder.AddColumn<string>(
                name: "social_links_json",
                table: "users",
                type: "text",
                nullable: true,
                collation: "utf8mb4_unicode_ci");

            migrationBuilder.AddColumn<string>(
                name: "benefits_json",
                table: "users",
                type: "text",
                nullable: true,
                collation: "utf8mb4_unicode_ci");

            migrationBuilder.AddColumn<string>(
                name: "office_images_json",
                table: "users",
                type: "text",
                nullable: true,
                collation: "utf8mb4_unicode_ci");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "headline", table: "users");
            migrationBuilder.DropColumn(name: "bio", table: "users");
            migrationBuilder.DropColumn(name: "tax_code", table: "users");
            migrationBuilder.DropColumn(name: "representative", table: "users");
            migrationBuilder.DropColumn(name: "address", table: "users");
            migrationBuilder.DropColumn(name: "cover_image_url", table: "users");
            migrationBuilder.DropColumn(name: "skills_json", table: "users");
            migrationBuilder.DropColumn(name: "education_json", table: "users");
            migrationBuilder.DropColumn(name: "experience_json", table: "users");
            migrationBuilder.DropColumn(name: "social_links_json", table: "users");
            migrationBuilder.DropColumn(name: "benefits_json", table: "users");
            migrationBuilder.DropColumn(name: "office_images_json", table: "users");
        }
    }
}
