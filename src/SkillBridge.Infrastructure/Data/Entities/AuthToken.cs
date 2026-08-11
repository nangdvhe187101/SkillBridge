using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("auth_tokens")]
[Index("UserId", "TokenType", Name = "idx_authtokens_user_type")]
public partial class AuthToken
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("token_type", TypeName = "enum('email_verify','password_reset','refresh','withdraw_otp','change_bank_otp','login_otp','sensitive_action')")]
    public string TokenType { get; set; } = null!;

    [Column("token_hash")]
    [StringLength(255)]
    public string TokenHash { get; set; } = null!;

    [Column("attempt_count")]
    public int AttemptCount { get; set; }

    [Column("max_attempts")]
    public int MaxAttempts { get; set; }

    [Column("ip_address")]
    [StringLength(45)]
    public string? IpAddress { get; set; }

    [Column("user_agent")]
    [StringLength(255)]
    public string? UserAgent { get; set; }

    [Column("expires_at", TypeName = "datetime")]
    public DateTime ExpiresAt { get; set; }

    [Column("used_at", TypeName = "datetime")]
    public DateTime? UsedAt { get; set; }

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [ForeignKey("UserId")]
    [InverseProperty("AuthTokens")]
    public virtual User User { get; set; } = null!;

    [InverseProperty("OtpToken")]
    public virtual ICollection<WithdrawalRequest> WithdrawalRequests { get; set; } = new List<WithdrawalRequest>();
}
