using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("applications")]
[Index("StudentId", Name = "fk_applications_student")]
[Index("JobId", "StudentId", Name = "uq_applications_job_student", IsUnique = true)]
public partial class JobApplication
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("job_id")]
    public int JobId { get; set; }

    [Column("student_id")]
    public int StudentId { get; set; }

    [Column("cv_file_id")]
    public int? CvFileId { get; set; }

    [Column("status", TypeName = "enum('pending','hired','submitted','completed','rejected','cancelled')")]
    public string Status { get; set; } = null!;

    [Column("applied_at", TypeName = "datetime")]
    public DateTime AppliedAt { get; set; }

    [Column("updated_at", TypeName = "datetime")]
    public DateTime UpdatedAt { get; set; }

    [ForeignKey("CvFileId")]
    [InverseProperty("JobApplications")]
    public virtual CvFile? CvFile { get; set; }

    [ForeignKey("JobId")]
    [InverseProperty("Applications")]
    public virtual Job Job { get; set; } = null!;

    [ForeignKey("StudentId")]
    [InverseProperty("Applications")]
    public virtual User Student { get; set; } = null!;
}
