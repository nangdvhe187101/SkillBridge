using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("admin_team_members")]
[Index("RoleId", Name = "idx_adminteam_role")]
[Index("Email", Name = "uq_adminteam_email", IsUnique = true)]
public partial class AdminTeamMember
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("name")]
    [StringLength(150)]
    public string Name { get; set; } = null!;

    [Column("email")]
    [StringLength(150)]
    public string Email { get; set; } = null!;

    [Column("role_id")]
    public int RoleId { get; set; }

    [Required]
    [Column("is_active")]
    public bool? IsActive { get; set; }

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [InverseProperty("Actor")]
    public virtual ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();

    [InverseProperty("KycReviewer")]
    public virtual ICollection<User> KycReviewedUsers { get; set; } = new List<User>();

    [InverseProperty("ResolvedByNavigation")]
    public virtual ICollection<Dispute> Disputes { get; set; } = new List<Dispute>();

    [InverseProperty("ReviewedByNavigation")]
    public virtual ICollection<ModerationQueue> ModerationQueues { get; set; } = new List<ModerationQueue>();

    [ForeignKey("RoleId")]
    [InverseProperty("AdminTeamMembers")]
    public virtual Role Role { get; set; } = null!;

    [InverseProperty("GrantedByNavigation")]
    public virtual ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();

    [InverseProperty("ResolvedByNavigation")]
    public virtual ICollection<SupportTicket> SupportTickets { get; set; } = new List<SupportTicket>();

    [InverseProperty("GrantedByNavigation")]
    public virtual ICollection<UserBadge> UserBadges { get; set; } = new List<UserBadge>();

    [InverseProperty("ProcessedByNavigation")]
    public virtual ICollection<WithdrawalRequest> WithdrawalRequests { get; set; } = new List<WithdrawalRequest>();
}