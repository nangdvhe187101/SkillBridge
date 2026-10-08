using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("student_verification_requests")]
public partial class StudentVerificationRequest
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("request_type")]
    [StringLength(30)]
    public string RequestType { get; set; } = "initial";

    [Column("status")]
    [StringLength(30)]
    public string Status { get; set; } = "pending";

    [Column("school_id")]
    public int SchoolId { get; set; }

    [Column("student_code")]
    [StringLength(50)]
    public string StudentCode { get; set; } = null!;

    [Column("student_code_normalized")]
    [StringLength(50)]
    public string StudentCodeNormalized { get; set; } = null!;

    [Column("full_name_on_card")]
    [StringLength(150)]
    public string FullNameOnCard { get; set; } = null!;

    [Column("graduation_year")]
    public short GraduationYear { get; set; }

    [Column("ocr_result_json", TypeName = "json")]
    public string? OcrResultJson { get; set; }

    [Column("risk_flags_json", TypeName = "json")]
    public string? RiskFlagsJson { get; set; }

    [Column("reason_code")]
    [StringLength(50)]
    public string? ReasonCode { get; set; }

    [Column("user_message", TypeName = "text")]
    public string? UserMessage { get; set; }

    [Column("rejection_reason", TypeName = "text")]
    public string? RejectionReason { get; set; }

    [Column("admin_note", TypeName = "text")]
    public string? AdminNote { get; set; }

    [Column("need_info_deadline", TypeName = "datetime")]
    public DateTime? NeedInfoDeadline { get; set; }

    [Column("resubmit_allowed")]
    public bool ResubmitAllowed { get; set; } = true;

    [Column("resubmit_after", TypeName = "datetime")]
    public DateTime? ResubmitAfter { get; set; }

    [Column("submitted_at", TypeName = "datetime")]
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

    [Column("reviewed_by_admin_id")]
    public int? ReviewedByAdminId { get; set; }

    [Column("reviewed_at", TypeName = "datetime")]
    public DateTime? ReviewedAt { get; set; }

    [ForeignKey("UserId")]
    [InverseProperty("StudentVerificationRequests")]
    public virtual User User { get; set; } = null!;

    [ForeignKey("SchoolId")]
    [InverseProperty("VerificationRequests")]
    public virtual School School { get; set; } = null!;

    [ForeignKey("ReviewedByAdminId")]
    public virtual AdminTeamMember? ReviewedByAdmin { get; set; }

    [InverseProperty("VerificationRequest")]
    public virtual ICollection<IdentityDocument> Documents { get; set; } = new List<IdentityDocument>();
}
