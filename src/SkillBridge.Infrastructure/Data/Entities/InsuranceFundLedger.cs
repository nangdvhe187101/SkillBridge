using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("insurance_fund_ledger")]
[Index("ClaimId", Name = "fk_insuranceledger_claim")]
[Index("DisputeId", Name = "fk_insuranceledger_dispute")]
[Index("CreatedAt", Name = "idx_insuranceledger_created", AllDescending = true)]
public partial class InsuranceFundLedger
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("type", TypeName = "enum('contribution','payout')")]
    public string Type { get; set; } = null!;

    [Column("source_type", TypeName = "enum('subscription','affiliate','ad_campaign')")]
    public string? SourceType { get; set; }

    [Column("source_id")]
    public int? SourceId { get; set; }

    [Column("claim_id")]
    public int? ClaimId { get; set; }

    [Column("dispute_id")]
    public int? DisputeId { get; set; }

    [Column("amount")]
    [Precision(12, 0)]
    public decimal Amount { get; set; }

    [Column("balance_after")]
    [Precision(12, 0)]
    public decimal BalanceAfter { get; set; }

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [ForeignKey("ClaimId")]
    [InverseProperty("InsuranceFundLedgers")]
    public virtual InsuranceFundClaim? Claim { get; set; }

    [ForeignKey("DisputeId")]
    [InverseProperty("InsuranceFundLedgers")]
    public virtual Dispute? Dispute { get; set; }
}
