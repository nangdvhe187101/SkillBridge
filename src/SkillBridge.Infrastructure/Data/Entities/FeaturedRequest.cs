using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("featured_requests")]
[Index("EmployerId", Name = "fk_featuredreq_employer")]
[Index("JobId", Name = "fk_featuredreq_job")]
public partial class FeaturedRequest
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("job_id")]
    public int JobId { get; set; }

    [Column("employer_id")]
    public int EmployerId { get; set; }

    [Column("paid_amount")]
    [Precision(12, 0)]
    public decimal PaidAmount { get; set; }

    [Column("status", TypeName = "enum('pending','approved','rejected')")]
    public string Status { get; set; } = null!;

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at", TypeName = "datetime")]
    public DateTime? UpdatedAt { get; set; }

    [ForeignKey("EmployerId")]
    [InverseProperty("FeaturedRequests")]
    public virtual User Employer { get; set; } = null!;

    [ForeignKey("JobId")]
    [InverseProperty("FeaturedRequests")]
    public virtual Job Job { get; set; } = null!;
}
