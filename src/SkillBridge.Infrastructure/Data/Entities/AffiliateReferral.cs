using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("affiliate_referrals")]
[Index("PartnerId", Name = "fk_affiliatereferrals_partner")]
[Index("StudentId", Name = "fk_affiliatereferrals_student")]
public partial class AffiliateReferral
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("partner_id")]
    public int PartnerId { get; set; }

    [Column("student_id")]
    public int? StudentId { get; set; }

    [Column("status", TypeName = "enum('clicked','converted','rejected')")]
    public string Status { get; set; } = null!;

    [Column("commission_amount")]
    [Precision(12, 0)]
    public decimal? CommissionAmount { get; set; }

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [Column("converted_at", TypeName = "datetime")]
    public DateTime? ConvertedAt { get; set; }

    [ForeignKey("PartnerId")]
    [InverseProperty("AffiliateReferrals")]
    public virtual AffiliatePartner Partner { get; set; } = null!;

    [ForeignKey("StudentId")]
    [InverseProperty("AffiliateReferrals")]
    public virtual User? Student { get; set; }
}
