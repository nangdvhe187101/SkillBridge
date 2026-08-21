using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("notifications")]
[Index("UserId", "IsRead", Name = "idx_notifications_user_read")]
public partial class Notification
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("icon")]
    [StringLength(10)]
    public string? Icon { get; set; }

    [Column("message_text")]
    [StringLength(255)]
    public string MessageText { get; set; } = null!;

    [Column("link")]
    [StringLength(255)]
    public string? Link { get; set; }

    [Column("is_read")]
    public bool IsRead { get; set; }

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [ForeignKey("UserId")]
    [InverseProperty("Notifications")]
    public virtual User User { get; set; } = null!;
}
