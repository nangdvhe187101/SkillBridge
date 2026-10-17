using System;
using System.Collections.Generic;

namespace SkillBridge.Application.DTOs.Admin;

public class AdminTransactionItemDto
{
    public int Id { get; set; }
    public int? UserId { get; set; }
    public string? UserName { get; set; }
    public string? UserEmail { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public sbyte Sign { get; set; }
    public int? ReferenceId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AdminTransactionPagedResultDto
{
    public List<AdminTransactionItemDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
}

public class AdminTransactionSummaryDto
{
    public decimal TotalInflow { get; set; }
    public decimal TotalOutflow { get; set; }
    public decimal NetAmount { get; set; }
    public int TotalCount { get; set; }
    public List<AdminTransactionTypeBreakdownDto> ByType { get; set; } = new();
}

public class AdminTransactionTypeBreakdownDto
{
    public string Type { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal TotalAmount { get; set; }
}
