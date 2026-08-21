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

    [Column("description", TypeName = "text")]
    public string? Description { get; set; }

    [Column("sponsor_name")]
    [StringLength(150)]
    public string? SponsorName { get; set; }

    [Column("target_audience")]
    [StringLength(150)]
    public string? TargetAudience { get; set; }

    [Column("cta_text")]
    [StringLength(100)]
    public string? CtaText { get; set; }

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
