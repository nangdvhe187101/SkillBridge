using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("cv_files")]
[Index("CategoryId", Name = "fk_cvfiles_category")]
[Index("StudentId", Name = "fk_cvfiles_student")]
public partial class CvFile
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("student_id")]
    public int StudentId { get; set; }

    [Column("file_name")]
    [StringLength(255)]
    public string FileName { get; set; } = null!;

    [Column("file_url")]
    [StringLength(500)]
    public string FileUrl { get; set; } = null!;

    [Column("public_id")]
    [StringLength(255)]
    public string PublicId { get; set; } = null!;

    [Column("file_size")]
    public int FileSize { get; set; }

    [Column("label")]
    [StringLength(100)]
    public string? Label { get; set; }

    [Column("category_id")]
    public int? CategoryId { get; set; }

    [Required]
    [Column("is_searchable")]
    public bool? IsSearchable { get; set; }

    [Column("uploaded_at", TypeName = "datetime")]
    public DateTime UploadedAt { get; set; }

    [Column("updated_at", TypeName = "datetime")]
    public DateTime UpdatedAt { get; set; }

    [ForeignKey("CategoryId")]
    [InverseProperty("CvFiles")]
    public virtual Category? Category { get; set; }

    [ForeignKey("StudentId")]
    [InverseProperty("CvFiles")]
    public virtual User Student { get; set; } = null!;

    [InverseProperty("CvFile")]
    public virtual ICollection<JobApplication> JobApplications { get; set; } = new List<JobApplication>();
}