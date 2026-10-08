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

    [Column("title")]
    [StringLength(200)]
    public string? Title { get; set; }

    [Column("type")]
    [StringLength(50)]
    public string? Type { get; set; }

    [Column("related_entity_type")]
    [StringLength(50)]
    public string? RelatedEntityType { get; set; }

    [Column("related_entity_id")]
    public int? RelatedEntityId { get; set; }

    [Column("is_read")]
    public bool IsRead { get; set; }

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey("UserId")]
    [InverseProperty("Notifications")]
    public virtual User User { get; set; } = null!;
}
