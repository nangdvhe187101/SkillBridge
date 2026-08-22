using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("saved_jobs")]
[Index("StudentId", "JobId", Name = "uq_saved_jobs_student_job", IsUnique = true)]
[Index("JobId", Name = "fk_saved_jobs_job")]
[Index("StudentId", Name = "fk_saved_jobs_student")]
public partial class SavedJob
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("student_id")]
    public int StudentId { get; set; }

    [Column("job_id")]
    public int JobId { get; set; }

    [Column("saved_at", TypeName = "datetime")]
    public DateTime SavedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey("JobId")]
    [InverseProperty("SavedJobs")]
    public virtual Job Job { get; set; } = null!;

    [ForeignKey("StudentId")]
    [InverseProperty("SavedJobs")]
    public virtual User Student { get; set; } = null!;
}
