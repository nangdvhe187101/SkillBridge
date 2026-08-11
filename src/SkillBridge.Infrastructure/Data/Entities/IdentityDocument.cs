using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("identity_documents")]
[Index("UserId", "DocType", Name = "idx_identitydocs_user_type")]
public partial class IdentityDocument
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("doc_type", TypeName = "enum('national_id','student_card','business_license','company_logo')")]
    public string DocType { get; set; } = null!;

    [Column("file_name")]
    [StringLength(255)]
    public string FileName { get; set; } = null!;

    [Column("file_type")]
    [StringLength(50)]
    public string FileType { get; set; } = null!;

    [Column("file_size")]
    public int FileSize { get; set; }

    [Column("uploaded_at", TypeName = "datetime")]
    public DateTime UploadedAt { get; set; }

    [ForeignKey("UserId")]
    [InverseProperty("IdentityDocuments")]
    public virtual User User { get; set; } = null!;
}
