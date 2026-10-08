using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("student_profiles")]
public partial class StudentProfile
{
    [Key]
    [Column("user_id")]
    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    public int UserId { get; set; }

    [Column("school_id")]
    public int SchoolId { get; set; }

    [Column("student_code")]
    [StringLength(50)]
    public string StudentCode { get; set; } = null!;

    [Column("student_code_normalized")]
    [StringLength(50)]
    public string StudentCodeNormalized { get; set; } = null!;

    [Column("verified_full_name")]
    [StringLength(150)]
    public string VerifiedFullName { get; set; } = null!;

    [Column("graduation_year")]
    public short GraduationYear { get; set; }

    [Column("verified_at", TypeName = "datetime")]
    public DateTime VerifiedAt { get; set; } = DateTime.UtcNow;

    [Column("expires_at", TypeName = "datetime")]
    public DateTime? ExpiresAt { get; set; }

    [Column("source_request_id")]
    public int SourceRequestId { get; set; }

    [ForeignKey("UserId")]
    [InverseProperty("StudentProfile")]
    public virtual User User { get; set; } = null!;

    [ForeignKey("SchoolId")]
    [InverseProperty("StudentProfiles")]
    public virtual School School { get; set; } = null!;

    [ForeignKey("SourceRequestId")]
    public virtual StudentVerificationRequest SourceRequest { get; set; } = null!;
}
