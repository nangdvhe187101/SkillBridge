using System;
using System.Collections.Generic;

namespace SkillBridge.Application.DTOs.Payments;

public class WalletResponseDto
{
    public int UserId { get; set; }
    public decimal Balance { get; set; }
    public decimal EscrowLocked { get; set; }
    public List<WalletTransactionDto> Transactions { get; set; } = new();
    public List<ReceiptDto> Receipts { get; set; } = new();
}

public class ReceiptDto
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public int JobId { get; set; }
    public string JobTitle { get; set; } = string.Empty;
    public string EmployerName { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public decimal Budget { get; set; }
    public decimal Commission { get; set; }
    public decimal Total { get; set; }
    public decimal NetPayout { get; set; }
    public DateTime CreatedAt { get; set; }
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
