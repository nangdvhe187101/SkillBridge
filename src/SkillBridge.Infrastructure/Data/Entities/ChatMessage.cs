using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("chat_messages")]
[Index("ConversationId", Name = "fk_chatmessages_conversation")]
[Index("SenderId", Name = "fk_chatmessages_sender")]
public partial class ChatMessage
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("conversation_id")]
    public int ConversationId { get; set; }

    [Column("sender_id")]
    public int SenderId { get; set; }

    [Column("message_text", TypeName = "text")]
    public string? MessageText { get; set; }

    [Column("attachment_url")]
    [StringLength(255)]
    public string? AttachmentUrl { get; set; }

    [Column("attachment_type")]
    [StringLength(50)]
    public string? AttachmentType { get; set; }

    [Column("sent_at", TypeName = "datetime")]
    public DateTime SentAt { get; set; }

    [ForeignKey("ConversationId")]
    [InverseProperty("ChatMessages")]
    public virtual Conversation Conversation { get; set; } = null!;

    [ForeignKey("SenderId")]
    [InverseProperty("ChatMessages")]
    public virtual User Sender { get; set; } = null!;
}
