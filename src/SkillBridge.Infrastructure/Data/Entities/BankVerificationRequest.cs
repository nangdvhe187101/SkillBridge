using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SkillBridge.Application.Common;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("bank_verification_requests")]
public partial class BankVerificationRequest
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("bank_name")]
    [StringLength(100)]
    public string BankName { get; set; } = null!;

    [Column("bank_code")]
    [StringLength(50)]
    public string BankCode { get; set; } = null!;

    [Column("account_number")]
    [StringLength(500)]
    public string AccountNumber { get; set; } = null!;

    [Column("account_number_mask")]
    [StringLength(20)]
    public string AccountNumberMask { get; set; } = null!;

    [Column("status")]
    public BankVerificationStatus Status { get; set; } = BankVerificationStatus.Pending;

    [Column("submitted_at", TypeName = "datetime")]
    public DateTime SubmittedAt { get; set; }

    [Column("reviewed_at", TypeName = "datetime")]
    public DateTime? ReviewedAt { get; set; }

    [Column("reviewed_by_admin_id")]
    public int? ReviewedByAdminId { get; set; }

    [Column("rejection_reason", TypeName = "text")]
    public string? RejectionReason { get; set; }

    [Column("bank_returned_name")]
    [StringLength(150)]
    public string? BankReturnedName { get; set; }

    [Column("request_ip_address")]
    [StringLength(50)]
    public string? RequestIpAddress { get; set; }

    [ForeignKey("UserId")]
    [InverseProperty("BankVerificationRequests")]
    public virtual User User { get; set; } = null!;

    [ForeignKey("ReviewedByAdminId")]
    [InverseProperty("BankVerificationRequests")]
    public virtual AdminTeamMember? ReviewedByAdmin { get; set; }
}
