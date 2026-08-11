using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("subscriptions")]
[Index("UserId", Name = "fk_subscriptions_user")]
public partial class Subscription
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("plan_name")]
    [StringLength(100)]
    public string PlanName { get; set; } = null!;

    [Column("amount_paid")]
    [Precision(12, 0)]
    public decimal AmountPaid { get; set; }

    [Column("renewal_date")]
    public DateOnly? RenewalDate { get; set; }

    [Column("status", TypeName = "enum('active','expiring','cancelled')")]
    public string Status { get; set; } = null!;

    [Column("started_at", TypeName = "datetime")]
    public DateTime StartedAt { get; set; }

    [Column("updated_at", TypeName = "datetime")]
    public DateTime UpdatedAt { get; set; }

    [ForeignKey("UserId")]
    [InverseProperty("Subscriptions")]
    public virtual User User { get; set; } = null!;
}
