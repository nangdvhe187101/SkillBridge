using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("dispute_evidence")]
[Index("DisputeId", Name = "fk_disputeevidence_dispute")]
[Index("SubmittedBy", Name = "fk_disputeevidence_submitter")]
public partial class DisputeEvidence
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("dispute_id")]
    public int DisputeId { get; set; }

    [Column("submitted_by")]
    public int SubmittedBy { get; set; }

    [Column("evidence_text", TypeName = "text")]
    public string? EvidenceText { get; set; }

    [Column("file_url")]
    [StringLength(255)]
    public string? FileUrl { get; set; }

    [Column("file_type")]
    [StringLength(50)]
    public string? FileType { get; set; }

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [ForeignKey("DisputeId")]
    [InverseProperty("DisputeEvidences")]
    public virtual Dispute Dispute { get; set; } = null!;

    [ForeignKey("SubmittedBy")]
    [InverseProperty("DisputeEvidences")]
    public virtual User SubmittedByNavigation { get; set; } = null!;
}
