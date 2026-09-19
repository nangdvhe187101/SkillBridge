using System;
using System.Collections.Generic;

namespace SkillBridge.Application.DTOs.Payments;

public class CreateWithdrawalDto
{
    public decimal Amount { get; set; }
}

public class WithdrawalResponseDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public decimal Amount { get; set; }
    public decimal Fee { get; set; }
    public decimal NetAmount { get; set; }
    public string Status { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public string AccountNumberMask { get; set; } = string.Empty;
    public string AccountHolderName { get; set; } = string.Empty;
    public string? RejectReason { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
}

public class AdminWithdrawalItemDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public string AccountNumberMask { get; set; } = string.Empty;
    public string? AccountNumberFull { get; set; } // Hỗ trợ Admin đối soát chuyển khoản
    public string AccountHolderName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal Fee { get; set; }
    public decimal NetAmount { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? RejectReason { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
}

public class AdminRejectWithdrawalDto
{
    public string Reason { get; set; } = string.Empty;
}

public class AdminApproveWithdrawalDto
{
    public string? Note { get; set; }
}

public class WithdrawalPagedResultDto<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
}
