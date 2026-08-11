using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("reviews")]
[Index("JobId", Name = "fk_reviews_job")]
[Index("RevieweeId", Name = "fk_reviews_reviewee")]
[Index("ReviewerId", Name = "fk_reviews_reviewer")]
public partial class Review
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("job_id")]
    public int JobId { get; set; }

    [Column("reviewer_id")]
    public int ReviewerId { get; set; }

    [Column("reviewee_id")]
    public int RevieweeId { get; set; }

    [Column("stars")]
    public sbyte Stars { get; set; }

    [Column("comment", TypeName = "text")]
    public string? Comment { get; set; }

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [ForeignKey("JobId")]
    [InverseProperty("Reviews")]
    public virtual Job Job { get; set; } = null!;

    [ForeignKey("RevieweeId")]
    [InverseProperty("ReviewReviewees")]
    public virtual User Reviewee { get; set; } = null!;

    [ForeignKey("ReviewerId")]
    [InverseProperty("ReviewReviewers")]
    public virtual User Reviewer { get; set; } = null!;
}
