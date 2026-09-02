using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("categories")]
public partial class Category
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("name")]
    [StringLength(100)]
    public string Name { get; set; } = null!;

    [Column("default_revision_limit")]
    public int DefaultRevisionLimit { get; set; }

    [Column("preview_strategy", TypeName = "enum('watermark_image','watermark_video','partial_text','sample_rows')")]
    public string PreviewStrategy { get; set; } = null!;

    [InverseProperty("Category")]
    public virtual ICollection<CvFile> CvFiles { get; set; } = new List<CvFile>();

    [InverseProperty("Category")]
    public virtual ICollection<Job> Jobs { get; set; } = new List<Job>();

    [InverseProperty("Category")]
    public virtual ICollection<SkillBadge> SkillBadges { get; set; } = new List<SkillBadge>();
}
