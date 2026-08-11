using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("conversations")]
[Index("JobId", Name = "fk_conversations_job")]
[Index("UserAId", Name = "fk_conversations_usera")]
[Index("UserBId", Name = "fk_conversations_userb")]
public partial class Conversation
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_a_id")]
    public int UserAId { get; set; }

    [Column("user_b_id")]
    public int UserBId { get; set; }

    [Column("job_id")]
    public int? JobId { get; set; }

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [InverseProperty("Conversation")]
    public virtual ICollection<ChatMessage> ChatMessages { get; set; } = new List<ChatMessage>();

    [ForeignKey("JobId")]
    [InverseProperty("Conversations")]
    public virtual Job? Job { get; set; }

    [ForeignKey("UserAId")]
    [InverseProperty("ConversationUserAs")]
    public virtual User UserA { get; set; } = null!;

    [ForeignKey("UserBId")]
    [InverseProperty("ConversationUserBs")]
    public virtual User UserB { get; set; } = null!;
}
