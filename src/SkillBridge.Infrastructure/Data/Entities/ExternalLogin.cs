using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("external_logins")]
public partial class ExternalLogin
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("provider")]
    [StringLength(30)]
    public string Provider { get; set; } = null!;

    [Column("provider_user_id")]
    [StringLength(100)]
    public string ProviderUserId { get; set; } = null!;

    [Column("provider_email")]
    [StringLength(150)]
    public string? ProviderEmail { get; set; }

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey("UserId")]
    [InverseProperty("ExternalLogins")]
    public virtual User User { get; set; } = null!;
}
