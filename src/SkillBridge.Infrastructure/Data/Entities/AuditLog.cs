using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("audit_log")]
[Index("ActorId", Name = "fk_auditlog_actor")]
public partial class AuditLog
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("actor_id")]
    public int ActorId { get; set; }

    [Column("action_text", TypeName = "text")]
    public string ActionText { get; set; } = null!;

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [ForeignKey("ActorId")]
    [InverseProperty("AuditLogs")]
    public virtual AdminTeamMember Actor { get; set; } = null!;
}
