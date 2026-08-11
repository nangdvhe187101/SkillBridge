using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("user_badges")]
[Index("BadgeId", Name = "fk_userbadges_badge")]
[Index("GrantedBy", Name = "fk_userbadges_grantedby")]
[Index("UserId", Name = "fk_userbadges_user")]
public partial class UserBadge
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("badge_id")]
    public int BadgeId { get; set; }

    [Column("granted_reason")]
    [StringLength(255)]
    public string? GrantedReason { get; set; }

    [Column("granted_by")]
    public int? GrantedBy { get; set; }

    [Column("granted_at", TypeName = "datetime")]
    public DateTime GrantedAt { get; set; }

    [ForeignKey("BadgeId")]
    [InverseProperty("UserBadges")]
    public virtual SkillBadge Badge { get; set; } = null!;

    [ForeignKey("GrantedBy")]
    [InverseProperty("UserBadges")]
    public virtual AdminTeamMember? GrantedByNavigation { get; set; }

    [ForeignKey("UserId")]
    [InverseProperty("UserBadges")]
    public virtual User User { get; set; } = null!;
}
