using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("portfolio_uploads")]
[Index("StudentId", Name = "fk_portfolio_student")]
public partial class PortfolioUpload
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("student_id")]
    public int StudentId { get; set; }

    [Column("file_name")]
    [StringLength(255)]
    public string FileName { get; set; } = null!;

    [Column("file_type")]
    [StringLength(50)]
    public string FileType { get; set; } = null!;

    [Column("file_url")]
    [StringLength(255)]
    public string? FileUrl { get; set; }

    [Column("uploaded_at", TypeName = "datetime")]
    public DateTime UploadedAt { get; set; }

    [ForeignKey("StudentId")]
    [InverseProperty("PortfolioUploads")]
    public virtual User Student { get; set; } = null!;
}
