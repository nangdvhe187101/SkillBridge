using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SkillBridge.Application.DTOs.Payments;

public class CreateWithdrawalDto
{
    [Required(ErrorMessage = "Vui lòng nhập số tiền rút")]
    [Range(50000, 100000000, ErrorMessage = "Số tiền rút phải từ 50,000đ - 100,000,000đ")]
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
    public bool RequiresMakerChecker { get; set; }
    public bool AwaitingChecker { get; set; }
    public string? Message { get; set; }
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
    public bool DecryptError { get; set; }
    public string AccountHolderName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal Fee { get; set; }
    public decimal NetAmount { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? RejectReason { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public bool RequiresMakerChecker { get; set; }
    public int? MakerId { get; set; }
    public string? MakerName { get; set; }
    public DateTime? MakerAt { get; set; }
    public string? MakerNote { get; set; }
    public bool AwaitingChecker { get; set; }
}

public class AdminRejectWithdrawalDto
{
    [Required]
    [MaxLength(200)]
    public string Reason { get; set; } = string.Empty;
}

public class AdminApproveWithdrawalDto
{
    [MaxLength(200)]
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

public class AdminFinanceSummaryDto
{
    public decimal TotalWalletBalance { get; set; }
    public decimal TotalEscrowBalance { get; set; }
    public int PendingWithdrawalsCount { get; set; }
    public decimal PendingWithdrawalsAmount { get; set; }
    public int CompletedWithdrawalsCount { get; set; }
    public decimal CompletedWithdrawalsAmount { get; set; }
    public int TotalWithdrawalsCount { get; set; }
}
