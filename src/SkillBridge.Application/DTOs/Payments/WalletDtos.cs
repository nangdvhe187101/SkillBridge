using System;
using System.Collections.Generic;

namespace SkillBridge.Application.DTOs.Payments;

public class WalletResponseDto
{
    public int UserId { get; set; }
    public decimal Balance { get; set; }
    public List<WalletTransactionDto> Transactions { get; set; } = new();
}

public class WalletTransactionDto
{
    public int Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public int Sign { get; set; }
    public int? ReferenceId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class TopupRequest
{
    public decimal Amount { get; set; }
    public string? PaymentMethod { get; set; }
}
