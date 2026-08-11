using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("security_logs")]
[Index("UserId", "CreatedAt", Name = "idx_securitylogs_user_created", IsDescending = new[] { false, true })]
public partial class SecurityLog
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("action")]
    [StringLength(50)]
    public string Action { get; set; } = null!;

    [Column("ip_address")]
    [StringLength(45)]
    public string? IpAddress { get; set; }

    [Column("user_agent")]
    [StringLength(255)]
    public string? UserAgent { get; set; }

    [Column("metadata", TypeName = "json")]
    public string? Metadata { get; set; }

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [ForeignKey("UserId")]
    [InverseProperty("SecurityLogs")]
    public virtual User User { get; set; } = null!;
}
