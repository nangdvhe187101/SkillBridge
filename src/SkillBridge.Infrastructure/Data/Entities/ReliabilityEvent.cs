using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("reliability_events")]
[Index("JobId", Name = "fk_reliabilityevents_job")]
[Index("UserId", "CreatedAt", Name = "idx_reliabilityevents_user_created", IsDescending = new[] { false, true })]
public partial class ReliabilityEvent
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("job_id")]
    public int? JobId { get; set; }

    [Column("change_amount")]
    public int ChangeAmount { get; set; }

    [Column("reason")]
    [StringLength(255)]
    public string Reason { get; set; } = null!;

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [ForeignKey("JobId")]
    [InverseProperty("ReliabilityEvents")]
    public virtual Job? Job { get; set; }

    [ForeignKey("UserId")]
    [InverseProperty("ReliabilityEvents")]
    public virtual User User { get; set; } = null!;
}
