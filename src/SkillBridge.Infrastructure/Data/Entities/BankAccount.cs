using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("bank_accounts")]
[Index("UserId", "IsDefault", Name = "idx_bankaccounts_user_default")]
public partial class BankAccount
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("bank_name")]
    [StringLength(100)]
    public string BankName { get; set; } = null!;

    [Column("account_number_encrypted")]
    [StringLength(255)]
    public string AccountNumberEncrypted { get; set; } = null!;

    [Column("account_number_mask")]
    [StringLength(20)]
    public string AccountNumberMask { get; set; } = null!;

    [Column("account_holder_name")]
    [StringLength(150)]
    public string AccountHolderName { get; set; } = null!;

    [Column("is_default")]
    public bool IsDefault { get; set; }

    [Column("is_verified")]
    public bool IsVerified { get; set; }

    [Column("verified_at", TypeName = "datetime")]
    public DateTime? VerifiedAt { get; set; }

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at", TypeName = "datetime")]
    public DateTime UpdatedAt { get; set; }

    [ForeignKey("UserId")]
    [InverseProperty("BankAccounts")]
    public virtual User User { get; set; } = null!;

    [InverseProperty("BankAccount")]
    public virtual ICollection<WithdrawalRequest> WithdrawalRequests { get; set; } = new List<WithdrawalRequest>();
}
