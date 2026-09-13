using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkillBridge.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDeadlineReminderTrackingToJobs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "deadline_overdue_sent_at",
                table: "jobs",
                type: "datetime",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "deadline_warning_sent_at",
                table: "jobs",
                type: "datetime",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "deadline_overdue_sent_at",
                table: "jobs");

            migrationBuilder.DropColumn(
                name: "deadline_warning_sent_at",
                table: "jobs");
        }
    }
}
