using System;
using System.Collections.Generic;

namespace SkillBridge.Application.DTOs.Payments;

public class CreateBankVerificationDto
{
    public string BankName { get; set; } = string.Empty;
    public string BankCode { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
}

public class BankVerificationResponseDto
{
    public int Id { get; set; }
    public string BankName { get; set; } = string.Empty;
    public string BankCode { get; set; } = string.Empty;
    public string AccountNumberMask { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? RejectionReason { get; set; }
    public string? BankReturnedName { get; set; }
}

public class DecodeQrResponseDto
{
    public string BankCode { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string? BankName { get; set; }
    public string? RawPayload { get; set; }
    public string? Message { get; set; }
}

public class AdminBankVerificationItemDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public string BankCode { get; set; } = string.Empty;
    public string AccountNumberMask { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
}

public class AdminBankVerificationDetailDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public string NormalizedUserName { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public string BankCode { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty; // STK giải mã đầy đủ
    public string AccountNumberMask { get; set; } = string.Empty;
    public string? QrCodeBase64 { get; set; } // Ảnh QR sinh mới chuẩn VietQR dạng Base64 data URL
    public string Status { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public int? ReviewedByAdminId { get; set; }
    public string? ReviewedByAdminName { get; set; }
    public string? RejectionReason { get; set; }
    public string? BankReturnedName { get; set; }
    public string? RequestIpAddress { get; set; }
    public bool HasConflictWithOtherUser { get; set; }
    public string? ConflictWarning { get; set; }
}

public class AdminApproveBankVerificationDto
{
    public string BankReturnedName { get; set; } = string.Empty;
}

public class AdminRejectBankVerificationDto
{
    public string RejectionReason { get; set; } = string.Empty;
}

public class BankVerificationPagedResultDto<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
}
