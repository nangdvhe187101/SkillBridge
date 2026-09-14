using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("wallets")]
public partial class Wallet
{
    [Key]
    [Column("user_id")]
    public int UserId { get; set; }

    [Column("balance")]
    [Precision(12, 0)]
    public decimal Balance { get; set; }

    [Column("bank_bin")]
    [StringLength(20)]
    public string? BankBin { get; set; }

    [Column("bank_name")]
    [StringLength(100)]
    public string? BankName { get; set; }

    [Column("account_number")]
    [StringLength(50)]
    public string? AccountNumber { get; set; }

    [Column("account_holder")]
    [StringLength(100)]
    public string? AccountHolder { get; set; }

    [Column("bank_branch")]
    [StringLength(100)]
    public string? BankBranch { get; set; }

    [Column("is_bank_verified")]
    public bool IsBankVerified { get; set; }

    [Column("bank_linked_at")]
    public DateTime? BankLinkedAt { get; set; }

    [ForeignKey("UserId")]
    [InverseProperty("Wallet")]
    public virtual User User { get; set; } = null!;
}
