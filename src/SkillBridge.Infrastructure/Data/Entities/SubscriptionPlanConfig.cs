using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("subscription_plan_configs")]
public class SubscriptionPlanConfig
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("code")]
    [StringLength(50)]
    public string Code { get; set; } = null!;

    [Column("target_role")]
    [StringLength(20)]
    public string TargetRole { get; set; } = null!; // "student" | "employer"

    [Column("name")]
    [StringLength(100)]
    public string Name { get; set; } = null!;

    [Column("tagline")]
    [StringLength(255)]
    public string? Tagline { get; set; }

    [Column("badge_text")]
    [StringLength(50)]
    public string? BadgeText { get; set; }

    [Column("price", TypeName = "decimal(12,2)")]
    public decimal Price { get; set; }

    [Column("price_sub")]
    [StringLength(100)]
    public string? PriceSub { get; set; }

    [Column("commission_rate", TypeName = "decimal(5,4)")]
    public decimal CommissionRate { get; set; }

    [Column("tier_rank")]
    public int TierRank { get; set; }

    [Column("max_active_jobs")]
    public int? MaxActiveJobs { get; set; }

    [Column("max_weekly_applications")]
    public int? MaxWeeklyApplications { get; set; }

    [Column("max_cv_files")]
    public int MaxCvFiles { get; set; } = 5;

    [Column("default_revision_limit")]
    public int DefaultRevisionLimit { get; set; } = 2;

    [Column("free_featured_pins")]
    public int FreeFeaturedPins { get; set; } = 0;

    [Column("free_direct_invites")]
    public int FreeDirectInvites { get; set; } = 0;

    [Column("features_json", TypeName = "text")]
    public string FeaturesJson { get; set; } = "[]";

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("is_popular")]
    public bool IsPopular { get; set; } = false;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
