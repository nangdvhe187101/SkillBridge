using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("ad_content")]
[Index("CampaignId", Name = "fk_adcontent_campaign")]
public partial class AdContent
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("campaign_id")]
    public int CampaignId { get; set; }

    [Column("title")]
    [StringLength(255)]
    public string Title { get; set; } = null!;

    [Column("status", TypeName = "enum('pending','approved','rejected')")]
    public string Status { get; set; } = null!;

    [Column("clicks")]
    public int Clicks { get; set; }

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [ForeignKey("CampaignId")]
    [InverseProperty("AdContents")]
    public virtual AdCampaign Campaign { get; set; } = null!;
}
