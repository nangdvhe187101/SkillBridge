using System;
using System.Collections.Generic;

namespace SkillBridge.Application.DTOs.Admin;

/// <summary>
/// DTO đại diện cho một ticket hỗ trợ người dùng trong danh sách quản trị
/// </summary>
public class AdminTicketItemDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = "open"; // 'open', 'resolved'
    public int? ResolvedBy { get; set; }
    public string? ResolverName { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public string Priority { get; set; } = "medium"; // 'high', 'medium', 'low'
    public List<AdminTicketReplyDto> Replies { get; set; } = new();
}

/// <summary>
/// DTO thông điệp phản hồi / tương tác trong ticket
/// </summary>
public class AdminTicketReplyDto
{
    public string Sender { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public string Time { get; set; } = string.Empty;
}

/// <summary>
/// DTO yêu cầu phản hồi hoặc đóng ticket
/// </summary>
public class AdminResolveTicketDto
{
    public string? ReplyMessage { get; set; }
    public bool CloseTicket { get; set; } = false;
}

/// <summary>
/// Kết quả phân trang danh sách tickets
/// </summary>
public class AdminTicketPagedResultDto
{
    public List<AdminTicketItemDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
    public int OpenCount { get; set; }
    public int ResolvedCount { get; set; }
}

/// <summary>
/// DTO chi tiết một bản ghi kiểm toán bất biến
/// </summary>
public class AdminAuditLogItemDto
{
    public int Id { get; set; }
    public int ActorId { get; set; }
    public string ActorName { get; set; } = string.Empty;
    public string ActorEmail { get; set; } = string.Empty;
    public string ActionText { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string FormattedTime { get; set; } = string.Empty;
}

/// <summary>
/// Kết quả phân trang danh sách Audit Logs
/// </summary>
public class AdminAuditLogPagedResultDto
{
    public List<AdminAuditLogItemDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}
