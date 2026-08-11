using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("insurance_fund_claims")]
[Index("ClaimantId", Name = "fk_insuranceclaims_claimant")]
[Index("JobId", Name = "fk_insuranceclaims_job")]
public partial class InsuranceFundClaim
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("job_id")]
    public int JobId { get; set; }

    [Column("claimant_id")]
    public int ClaimantId { get; set; }

    [Column("claimant_role", TypeName = "enum('student','employer')")]
    public string ClaimantRole { get; set; } = null!;

    [Column("description", TypeName = "text")]
    public string Description { get; set; } = null!;

    [Column("payout_amount")]
    [Precision(12, 0)]
    public decimal? PayoutAmount { get; set; }

    [Column("status", TypeName = "enum('pending','approved','rejected')")]
    public string Status { get; set; } = null!;

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at", TypeName = "datetime")]
    public DateTime? UpdatedAt { get; set; }

    [ForeignKey("ClaimantId")]
    [InverseProperty("InsuranceFundClaims")]
    public virtual User Claimant { get; set; } = null!;

    [InverseProperty("Claim")]
    public virtual ICollection<InsuranceFundLedger> InsuranceFundLedgers { get; set; } = new List<InsuranceFundLedger>();

    [ForeignKey("JobId")]
    [InverseProperty("InsuranceFundClaims")]
    public virtual Job Job { get; set; } = null!;
}
