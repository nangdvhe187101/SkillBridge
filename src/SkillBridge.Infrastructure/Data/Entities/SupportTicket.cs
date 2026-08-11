using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("support_tickets")]
[Index("ResolvedBy", Name = "fk_supporttickets_resolvedby")]
[Index("UserId", Name = "fk_supporttickets_user")]
public partial class SupportTicket
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("subject")]
    [StringLength(255)]
    public string Subject { get; set; } = null!;

    [Column("description", TypeName = "text")]
    public string Description { get; set; } = null!;

    [Column("status", TypeName = "enum('open','resolved')")]
    public string Status { get; set; } = null!;

    [Column("resolved_by")]
    public int? ResolvedBy { get; set; }

    [Column("resolved_at", TypeName = "datetime")]
    public DateTime? ResolvedAt { get; set; }

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [ForeignKey("ResolvedBy")]
    [InverseProperty("SupportTickets")]
    public virtual AdminTeamMember? ResolvedByNavigation { get; set; }

    [ForeignKey("UserId")]
    [InverseProperty("SupportTickets")]
    public virtual User User { get; set; } = null!;
}
