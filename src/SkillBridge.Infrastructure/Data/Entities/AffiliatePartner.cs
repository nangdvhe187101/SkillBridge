using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("affiliate_partners")]
public partial class AffiliatePartner
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("name")]
    [StringLength(150)]
    public string Name { get; set; } = null!;

    [Column("type")]
    [StringLength(150)]
    public string? Type { get; set; }

    [Column("status", TypeName = "enum('pending','approved','rejected')")]
    public string Status { get; set; } = null!;

    [Column("commission_rate")]
    [Precision(5, 2)]
    public decimal? CommissionRate { get; set; }

    [InverseProperty("Partner")]
    public virtual ICollection<AffiliateReferral> AffiliateReferrals { get; set; } = new List<AffiliateReferral>();
}
