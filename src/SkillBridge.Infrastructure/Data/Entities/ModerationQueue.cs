using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("moderation_queue")]
[Index("JobId", Name = "fk_modqueue_job")]
[Index("ReviewedBy", Name = "fk_modqueue_reviewer")]
public partial class ModerationQueue
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("job_id")]
    public int JobId { get; set; }

    [Column("flag_reason")]
    [StringLength(255)]
    public string? FlagReason { get; set; }

    [Column("submitted_at", TypeName = "datetime")]
    public DateTime SubmittedAt { get; set; }

    [Column("status", TypeName = "enum('pending','approved','rejected')")]
    public string Status { get; set; } = null!;

    [Column("reviewed_at", TypeName = "datetime")]
    public DateTime? ReviewedAt { get; set; }

    [Column("reviewed_by")]
    public int? ReviewedBy { get; set; }

    [ForeignKey("JobId")]
    [InverseProperty("ModerationQueues")]
    public virtual Job Job { get; set; } = null!;

    [ForeignKey("ReviewedBy")]
    [InverseProperty("ModerationQueues")]
    public virtual AdminTeamMember? ReviewedByNavigation { get; set; }
}
