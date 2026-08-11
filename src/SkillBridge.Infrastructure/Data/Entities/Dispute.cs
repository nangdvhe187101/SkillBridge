using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("disputes")]
[Index("DeliverableId", Name = "fk_disputes_deliverable")]
[Index("EmployerId", Name = "fk_disputes_employer")]
[Index("JobId", Name = "fk_disputes_job")]
[Index("ResolvedBy", Name = "fk_disputes_resolvedby")]
[Index("StudentId", Name = "fk_disputes_student")]
public partial class Dispute
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("job_id")]
    public int JobId { get; set; }

    [Column("student_id")]
    public int StudentId { get; set; }

    [Column("employer_id")]
    public int EmployerId { get; set; }

    [Column("deliverable_id")]
    public int? DeliverableId { get; set; }

    [Column("amount")]
    [Precision(12, 0)]
    public decimal Amount { get; set; }

    [Column("filed_by", TypeName = "enum('student','employer')")]
    public string FiledBy { get; set; } = null!;

    [Column("origin", TypeName = "enum('manual','revision_limit_exceeded')")]
    public string Origin { get; set; } = null!;

    [Column("reason", TypeName = "text")]
    public string Reason { get; set; } = null!;

    [Column("status", TypeName = "enum('open','closed')")]
    public string Status { get; set; } = null!;

    [Column("decision", TypeName = "enum('accept','reject')")]
    public string? Decision { get; set; }

    [Column("payout_amount")]
    [Precision(12, 0)]
    public decimal? PayoutAmount { get; set; }

    [Column("payout_to_role", TypeName = "enum('student','employer')")]
    public string? PayoutToRole { get; set; }

    [Column("resolved_note", TypeName = "text")]
    public string? ResolvedNote { get; set; }

    [Column("filed_at", TypeName = "datetime")]
    public DateTime FiledAt { get; set; }

    [Column("resolved_at", TypeName = "datetime")]
    public DateTime? ResolvedAt { get; set; }

    [Column("resolved_by")]
    public int? ResolvedBy { get; set; }

    [ForeignKey("DeliverableId")]
    [InverseProperty("Disputes")]
    public virtual JobDeliverable? Deliverable { get; set; }

    [InverseProperty("Dispute")]
    public virtual ICollection<DisputeEvidence> DisputeEvidences { get; set; } = new List<DisputeEvidence>();

    [ForeignKey("EmployerId")]
    [InverseProperty("DisputeEmployers")]
    public virtual User Employer { get; set; } = null!;

    [InverseProperty("Dispute")]
    public virtual ICollection<InsuranceFundLedger> InsuranceFundLedgers { get; set; } = new List<InsuranceFundLedger>();

    [ForeignKey("JobId")]
    [InverseProperty("Disputes")]
    public virtual Job Job { get; set; } = null!;

    [ForeignKey("ResolvedBy")]
    [InverseProperty("Disputes")]
    public virtual AdminTeamMember? ResolvedByNavigation { get; set; }

    [ForeignKey("StudentId")]
    [InverseProperty("DisputeStudents")]
    public virtual User Student { get; set; } = null!;
}
