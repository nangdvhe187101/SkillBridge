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
[Index("UserAId", "RequestStatus", "IsArchivedUserA", "LastMessageAt", Name = "idx_conversations_user_a_tab")]
[Index("UserBId", "RequestStatus", "IsArchivedUserB", "LastMessageAt", Name = "idx_conversations_user_b_tab")]
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

    [Column("last_message_at", TypeName = "datetime")]
    public DateTime? LastMessageAt { get; set; }

    [Column("unread_count_user_a")]
    public int UnreadCountUserA { get; set; }

    [Column("unread_count_user_b")]
    public int UnreadCountUserB { get; set; }

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [Column("is_read_only")]
    public bool IsReadOnly { get; set; } = false;

    [Column("read_only_reason")]
    [StringLength(50)]
    public string? ReadOnlyReason { get; set; }

    [Column("is_archived_user_a")]
    public bool IsArchivedUserA { get; set; } = false;

    [Column("is_archived_user_b")]
    public bool IsArchivedUserB { get; set; } = false;

    [Column("request_status")]
    [StringLength(20)]
    public string RequestStatus { get; set; } = "active";

    [Column("request_initiated_by")]
    public int? RequestInitiatedBy { get; set; }

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

    [ForeignKey("RequestInitiatedBy")]
    public virtual User? RequestInitiatedByUser { get; set; }
}
