using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("withdrawal_requests")]
[Index("BankAccountId", Name = "fk_withdrawalreq_bankaccount")]
[Index("ProcessedBy", Name = "fk_withdrawalreq_processedby")]
[Index("TransactionId", Name = "fk_withdrawalreq_transaction")]
[Index("OtpTokenId", Name = "idx_withdrawalreq_otptoken")]
[Index("Status", Name = "idx_withdrawalreq_status")]
[Index("UserId", "Status", "CreatedAt", Name = "idx_withdrawalreq_user_status_created", IsDescending = new[] { false, false, true })]
public partial class WithdrawalRequest
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("bank_account_id")]
    public int BankAccountId { get; set; }

    [Column("amount")]
    [Precision(12, 0)]
    public decimal Amount { get; set; }

    [Column("fee")]
    [Precision(12, 0)]
    public decimal Fee { get; set; }

    [Column("net_amount")]
    [Precision(12, 0)]
    public decimal NetAmount { get; set; }

    [Column("status", TypeName = "enum('pending','otp_pending','processing','completed','rejected','cancelled')")]
    public string Status { get; set; } = null!;

    [Column("otp_token_id")]
    public int? OtpTokenId { get; set; }

    [Column("reject_reason", TypeName = "text")]
    public string? RejectReason { get; set; }

    [Column("otp_verified_at", TypeName = "datetime")]
    public DateTime? OtpVerifiedAt { get; set; }

    [Column("processed_by")]
    public int? ProcessedBy { get; set; }

    [Column("processed_at", TypeName = "datetime")]
    public DateTime? ProcessedAt { get; set; }

    [Column("transaction_id")]
    public int? TransactionId { get; set; }

    [Column("ip_address")]
    [StringLength(45)]
    public string? IpAddress { get; set; }

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at", TypeName = "datetime")]
    public DateTime UpdatedAt { get; set; }

    [ForeignKey("BankAccountId")]
    [InverseProperty("WithdrawalRequests")]
    public virtual BankAccount BankAccount { get; set; } = null!;

    [ForeignKey("OtpTokenId")]
    [InverseProperty("WithdrawalRequests")]
    public virtual AuthToken? OtpToken { get; set; }

    [ForeignKey("ProcessedBy")]
    [InverseProperty("WithdrawalRequests")]
    public virtual AdminTeamMember? ProcessedByNavigation { get; set; }

    [ForeignKey("TransactionId")]
    [InverseProperty("WithdrawalRequests")]
    public virtual Transaction? Transaction { get; set; }

    [ForeignKey("UserId")]
    [InverseProperty("WithdrawalRequests")]
    public virtual User User { get; set; } = null!;
}
