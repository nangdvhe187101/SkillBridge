using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("reports")]
[Index("ReporterId", Name = "fk_reports_reporter")]
[Index("TargetUserId", Name = "fk_reports_targetuser")]
[Index("TargetJobId", Name = "idx_reports_targetjob")]
public partial class Report
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("reporter_id")]
    public int ReporterId { get; set; }

    [Column("target_user_id")]
    public int? TargetUserId { get; set; }

    [Column("target_job_id")]
    public int? TargetJobId { get; set; }

    [Column("reason")]
    [StringLength(255)]
    public string Reason { get; set; } = null!;

    [Column("description", TypeName = "text")]
    public string? Description { get; set; }

    [Column("status", TypeName = "enum('pending','reviewed','dismissed')")]
    public string Status { get; set; } = null!;

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [ForeignKey("ReporterId")]
    [InverseProperty("ReportReporters")]
    public virtual User Reporter { get; set; } = null!;

    [ForeignKey("TargetJobId")]
    [InverseProperty("Reports")]
    public virtual Job? TargetJob { get; set; }

    [ForeignKey("TargetUserId")]
    [InverseProperty("ReportTargetUsers")]
    public virtual User? TargetUser { get; set; }
}
