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

    [ForeignKey("UserId")]
    [InverseProperty("Wallet")]
    public virtual User User { get; set; } = null!;
}
