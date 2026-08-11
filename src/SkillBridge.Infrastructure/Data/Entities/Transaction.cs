using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("transactions")]
[Index("UserId", "CreatedAt", Name = "idx_transactions_user_created", IsDescending = new[] { false, true })]
public partial class Transaction
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int? UserId { get; set; }

    [Column("type", TypeName = "enum('topup','withdraw_hold','withdraw_refund','withdraw_fee','subscription','escrow_hold','escrow_release','escrow_refund','commission','featured_fee','ad_spend','insurance_payout','referral_bonus')")]
    public string Type { get; set; } = null!;

    [Column("label")]
    [StringLength(255)]
    public string Label { get; set; } = null!;

    [Column("amount")]
    [Precision(12, 0)]
    public decimal Amount { get; set; }

    [Column("sign")]
    public sbyte Sign { get; set; }

    [Column("reference_id")]
    public int? ReferenceId { get; set; }

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [ForeignKey("UserId")]
    [InverseProperty("Transactions")]
    public virtual User? User { get; set; }

    [InverseProperty("Transaction")]
    public virtual ICollection<WithdrawalRequest> WithdrawalRequests { get; set; } = new List<WithdrawalRequest>();
}
