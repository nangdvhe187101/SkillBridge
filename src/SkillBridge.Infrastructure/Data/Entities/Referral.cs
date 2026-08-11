using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("referrals")]
[Index("ReferrerId", Name = "fk_referrals_referrer")]
[Index("ReferredId", Name = "uq_referrals_referred", IsUnique = true)]
public partial class Referral
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("referrer_id")]
    public int ReferrerId { get; set; }

    [Column("referred_id")]
    public int ReferredId { get; set; }

    [Column("status", TypeName = "enum('pending','completed','rewarded')")]
    public string Status { get; set; } = null!;

    [Column("reward_amount")]
    [Precision(12, 0)]
    public decimal? RewardAmount { get; set; }

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [Column("completed_at", TypeName = "datetime")]
    public DateTime? CompletedAt { get; set; }

    [Column("rewarded_at", TypeName = "datetime")]
    public DateTime? RewardedAt { get; set; }

    [ForeignKey("ReferredId")]
    [InverseProperty("ReferralReferred")]
    public virtual User Referred { get; set; } = null!;

    [ForeignKey("ReferrerId")]
    [InverseProperty("ReferralReferrers")]
    public virtual User Referrer { get; set; } = null!;
}
