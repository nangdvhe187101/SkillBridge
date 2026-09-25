using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("job_deadline_extensions")]
[Index("JobId", "Status", Name = "idx_job_deadline_extensions_job_status")]
[Index("StudentId", Name = "fk_job_deadline_extensions_student")]
public partial class JobDeadlineExtension
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("job_id")]
    public int JobId { get; set; }

    [Column("student_id")]
    public int StudentId { get; set; }

    [Column("additional_days")]
    public int AdditionalDays { get; set; }

    [Column("current_deadline", TypeName = "datetime")]
    public DateTime CurrentDeadline { get; set; }

    [Column("proposed_deadline", TypeName = "datetime")]
    public DateTime ProposedDeadline { get; set; }

    [Column("reason_category")]
    [StringLength(100)]
    public string ReasonCategory { get; set; } = null!;

    [Column("detail_reason", TypeName = "text")]
    public string DetailReason { get; set; } = null!;

    [Column("status", TypeName = "enum('pending','accepted','rejected','cancelled')")]
    public string Status { get; set; } = "pending";

    [Column("rejection_reason", TypeName = "text")]
    public string? RejectionReason { get; set; }

    [Column("requested_at", TypeName = "datetime")]
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;

    [Column("responded_at", TypeName = "datetime")]
    public DateTime? RespondedAt { get; set; }

    [Column("responded_by_user_id")]
    public int? RespondedByUserId { get; set; }

    [ForeignKey("JobId")]
    [InverseProperty("DeadlineExtensions")]
    public virtual Job Job { get; set; } = null!;

    [ForeignKey("StudentId")]
    [InverseProperty("StudentDeadlineExtensions")]
    public virtual User Student { get; set; } = null!;

    [ForeignKey("RespondedByUserId")]
    public virtual User? RespondedByUser { get; set; }
}
