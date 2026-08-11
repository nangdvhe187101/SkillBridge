using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("job_requirements")]
[Index("JobId", Name = "fk_jobreq_job")]
public partial class JobRequirement
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("job_id")]
    public int JobId { get; set; }

    [Column("requirement_text")]
    [StringLength(255)]
    public string RequirementText { get; set; } = null!;

    [Column("sort_order")]
    public int SortOrder { get; set; }

    [ForeignKey("JobId")]
    [InverseProperty("JobRequirements")]
    public virtual Job Job { get; set; } = null!;
}
