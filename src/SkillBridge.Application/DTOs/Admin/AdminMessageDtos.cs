using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SkillBridge.Application.DTOs.Admin;

public class AdminChatMessageDto
{
    public int Id { get; set; }
    public int SenderId { get; set; }
    public string SenderName { get; set; } = string.Empty;
    public string SenderRole { get; set; } = string.Empty; // "student" | "employer" | "admin" | "system"
    public string MessageText { get; set; } = string.Empty;
    public string? AttachmentUrl { get; set; }
    public string? AttachmentType { get; set; }
    public DateTime SentAt { get; set; }
    public bool IsSystem { get; set; }
    public bool IsViolation { get; set; }
}

public class AdminConversationItemDto
{
    public int Id { get; set; }
    public int? JobId { get; set; }
    public string JobTitle { get; set; } = string.Empty;
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string StudentEmail { get; set; } = string.Empty;
    public int EmployerId { get; set; }
    public string EmployerName { get; set; } = string.Empty;
    public string EmployerEmail { get; set; } = string.Empty;
    public string LastMessage { get; set; } = string.Empty;
    public DateTime? LastMessageAt { get; set; }
    public string Status { get; set; } = "active"; // "active" | "warned" | "locked"
    public string? RiskFlag { get; set; }
    public bool IsReadOnly { get; set; }
    public string? ReadOnlyReason { get; set; }
    public int MessageCount { get; set; }
}

public class AdminConversationDetailDto
{
    public AdminConversationItemDto Conversation { get; set; } = null!;
    public List<AdminChatMessageDto> Messages { get; set; } = new();
}

public class AdminWarnChatDto
{
    [MaxLength(500)]
    public string? Message { get; set; }
}

public class AdminLockChatDto
{
    [MaxLength(255)]
    public string? Reason { get; set; }
}

public class AdminBroadcastDto
{
    [Required(ErrorMessage = "Tiêu đề thông báo không được để trống")]
    [MaxLength(150, ErrorMessage = "Tiêu đề tối đa 150 ký tự")]
    public string Title { get; set; } = string.Empty;

    [Required(ErrorMessage = "Nội dung thông báo không được để trống")]
    [MaxLength(1000, ErrorMessage = "Nội dung tối đa 1000 ký tự")]
    public string Content { get; set; } = string.Empty;

    public string TargetRole { get; set; } = "all"; // "all" | "student" | "employer"
}

public class AdminConversationPagedResultDto
{
    public List<AdminConversationItemDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int WarnedCount { get; set; }
    public int ActiveCount { get; set; }
    public int LockedCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
}
