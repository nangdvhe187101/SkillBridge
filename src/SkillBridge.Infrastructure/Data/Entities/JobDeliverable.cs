using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("job_deliverables")]
[Index("JobId", Name = "fk_deliverables_job")]
[Index("StudentId", Name = "fk_deliverables_student")]
[Index("JobId", "Version", Name = "uq_deliverables_job_version", IsUnique = true)]
public partial class JobDeliverable
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("job_id")]
    public int JobId { get; set; }

    [Column("student_id")]
    public int StudentId { get; set; }

    [Column("version")]
    public int Version { get; set; }

    [Column("preview_file_url")]
    [StringLength(255)]
    public string PreviewFileUrl { get; set; } = null!;

    [Column("final_file_url")]
    [StringLength(255)]
    public string? FinalFileUrl { get; set; }

    [Column("external_url")]
    [StringLength(500)]
    public string? ExternalUrl { get; set; }

    [Column("file_name")]
    [StringLength(255)]
    public string FileName { get; set; } = null!;

    [Column("file_type")]
    [StringLength(50)]
    public string FileType { get; set; } = null!;

    [Column("note", TypeName = "text")]
    public string? Note { get; set; }

    [Column("status", TypeName = "enum('submitted','revision_requested','accepted')")]
    public string Status { get; set; } = null!;

    [Column("submitted_at", TypeName = "datetime")]
    public DateTime SubmittedAt { get; set; }

    [Column("reviewed_at", TypeName = "datetime")]
    public DateTime? ReviewedAt { get; set; }

    [InverseProperty("Deliverable")]
    public virtual ICollection<DeliverableFeedback> DeliverableFeedbacks { get; set; } = new List<DeliverableFeedback>();

    [InverseProperty("Deliverable")]
    public virtual ICollection<Dispute> Disputes { get; set; } = new List<Dispute>();

    [ForeignKey("JobId")]
    [InverseProperty("JobDeliverables")]
    public virtual Job Job { get; set; } = null!;

    [ForeignKey("StudentId")]
    [InverseProperty("JobDeliverables")]
    public virtual User Student { get; set; } = null!;
}
