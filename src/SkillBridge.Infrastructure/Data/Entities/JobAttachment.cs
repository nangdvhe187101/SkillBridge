using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("job_attachments")]
public partial class JobAttachment
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("job_id")]
    public int JobId { get; set; }

    [Column("file_name")]
    [StringLength(255)]
    public string FileName { get; set; } = null!;

    [Column("file_url")]
    [StringLength(1000)]
    public string FileUrl { get; set; } = null!;

    [Column("file_size")]
    public long FileSize { get; set; }

    [Column("file_type")]
    [StringLength(100)]
    public string FileType { get; set; } = null!;

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [ForeignKey("JobId")]
    [InverseProperty("Attachments")]
    public virtual Job Job { get; set; } = null!;
}
