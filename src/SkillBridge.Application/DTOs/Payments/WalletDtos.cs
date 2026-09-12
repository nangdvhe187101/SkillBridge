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
    public bool HasVipSubscription { get; set; }
    public bool HasProSubscription { get; set; }
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

public class PurchaseSubscriptionRequest
{
    public string PlanType { get; set; } = string.Empty; // "VIP" or "PRO"
}

public class SubscriptionResponseDto
{
    public int Id { get; set; }
    public string PlanName { get; set; } = string.Empty;
    public decimal AmountPaid { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public DateOnly? RenewalDate { get; set; }
}
