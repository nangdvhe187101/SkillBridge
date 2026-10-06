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

    [Column("file_url")]
    [StringLength(500)]
    public string FileUrl { get; set; } = null!;

    [Column("public_id")]
    [StringLength(255)]
    public string PublicId { get; set; } = null!;

    [Column("file_type")]
    [StringLength(50)]
    public string FileType { get; set; } = null!;

    [Column("file_size")]
    public int FileSize { get; set; }

    [Column("uploaded_at", TypeName = "datetime")]
    public DateTime UploadedAt { get; set; }

    [Column("verification_request_id")]
    public int? VerificationRequestId { get; set; }

    [Column("side")]
    [StringLength(10)]
    public string? Side { get; set; }

    [Column("file_sha256")]
    [StringLength(64)]
    public string? FileSha256 { get; set; }

    [Column("purge_after", TypeName = "datetime")]
    public DateTime? PurgeAfter { get; set; }

    [Column("purged_at", TypeName = "datetime")]
    public DateTime? PurgedAt { get; set; }

    [ForeignKey("UserId")]
    [InverseProperty("IdentityDocuments")]
    public virtual User User { get; set; } = null!;

    [ForeignKey("VerificationRequestId")]
    [InverseProperty("Documents")]
    public virtual StudentVerificationRequest? VerificationRequest { get; set; }
}