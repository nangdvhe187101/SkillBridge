using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("ad_campaigns")]
[Index("BusinessId", Name = "fk_adcampaigns_business")]
[Index("Status", "Spent", "LastBilledSpent", Name = "idx_adcampaigns_status_spent")]
public partial class AdCampaign
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("business_id")]
    public int BusinessId { get; set; }

    [Column("budget")]
    [Precision(12, 0)]
    public decimal Budget { get; set; }

    [Column("spent")]
    [Precision(12, 0)]
    public decimal Spent { get; set; }

    [Column("last_billed_spent")]
    [Precision(12, 0)]
    public decimal LastBilledSpent { get; set; }

    [Column("clicks")]
    public int Clicks { get; set; }

    [Column("status", TypeName = "enum('running','paused')")]
    public string Status { get; set; } = null!;

    [InverseProperty("Campaign")]
    public virtual ICollection<AdContent> AdContents { get; set; } = new List<AdContent>();

    [ForeignKey("BusinessId")]
    [InverseProperty("AdCampaigns")]
    public virtual User Business { get; set; } = null!;
}
