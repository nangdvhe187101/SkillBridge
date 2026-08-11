using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("deliverable_feedback")]
[Index("DeliverableId", Name = "fk_delivfeedback_deliverable")]
[Index("EmployerId", Name = "fk_delivfeedback_employer")]
public partial class DeliverableFeedback
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("deliverable_id")]
    public int DeliverableId { get; set; }

    [Column("employer_id")]
    public int EmployerId { get; set; }

    [Column("feedback_text", TypeName = "text")]
    public string FeedbackText { get; set; } = null!;

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [ForeignKey("DeliverableId")]
    [InverseProperty("DeliverableFeedbacks")]
    public virtual JobDeliverable Deliverable { get; set; } = null!;

    [ForeignKey("EmployerId")]
    [InverseProperty("DeliverableFeedbacks")]
    public virtual User Employer { get; set; } = null!;
}
