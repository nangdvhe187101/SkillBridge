using System;
using System.Collections.Generic;

namespace SkillBridge.Application.DTOs.Admin;

/// <summary>
/// DTO thống kê tổng quan dòng tiền Escrow và trạng thái hợp đồng (REQ-CEM-01)
/// </summary>
public class AdminContractStatsDto
{
    public int TotalActiveContracts { get; set; }
    public decimal TotalEscrowLocked { get; set; }
    public int SlaBreachedReviewCount { get; set; }
    public int SlaBreachedDeadlineCount { get; set; }
}

/// <summary>
/// DTO hợp đồng trong danh sách hiển thị cho Admin (REQ-CEM-02)
/// </summary>
public class AdminContractListItemDto
{
    public int Id { get; set; }
    public string Code { get; set; } = null!;
    public string Title { get; set; } = null!;
    public decimal Budget { get; set; }
    public decimal EscrowAmount { get; set; }
    public string Status { get; set; } = null!;

    // Sinh viên
    public int? StudentId { get; set; }
    public string? StudentName { get; set; }
    public string? StudentEmail { get; set; }
    public int StudentReliability { get; set; }

    // Nhà tuyển dụng
    public int EmployerId { get; set; }
    public string EmployerName { get; set; } = null!;
    public string EmployerEmail { get; set; } = null!;
    public int EmployerReliability { get; set; }

    // Mốc thời gian & SLA
    public DateTime PostedAt { get; set; }
    public DateTime? DeadlineAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public bool IsSlaReviewBreached { get; set; } // > 72h chưa duyệt
    public bool IsSlaDeadlineBreached { get; set; } // > 7 ngày sau deadline chưa nộp
    public int? HoursSinceSubmitted { get; set; }
    public int? DaysOverdueDeadline { get; set; }
    public bool RequiresMakerChecker { get; set; } // Escrow > 5M
    public string? PendingActionType { get; set; } // "release" | "refund" khi đang chờ checker
}

/// <summary>
/// DTO thông tin chi tiết hợp đồng và sản phẩm bàn giao (REQ-CEM-03)
/// </summary>
public class AdminContractDetailDto : AdminContractListItemDto
{
    public string Description { get; set; } = null!;
    public string? CategoryName { get; set; }
    public List<AdminDeliverableItemDto> Deliverables { get; set; } = new();
    public List<AdminContractMessageDto> RecentChatMessages { get; set; } = new();
}

public class AdminDeliverableItemDto
{
    public int Id { get; set; }
    public int Version { get; set; }
    public string FileUrl { get; set; } = null!;
    public string Status { get; set; } = null!;
    public string? StudentNotes { get; set; }
    public string? ExternalLink { get; set; }
    public DateTime SubmittedAt { get; set; }
}

public class AdminContractMessageDto
{
    public int Id { get; set; }
    public string SenderName { get; set; } = null!;
    public string MessageText { get; set; } = null!;
    public DateTime SentAt { get; set; }
}

/// <summary>
/// Request DTO cho hành động cưỡng chế giải ngân / hoàn cọc (REQ-CEM-04, REQ-CEM-05)
/// </summary>
public class ForceContractActionRequestDto
{
    public string Reason { get; set; } = null!;
    public string ConfirmPhrase { get; set; } = null!; // Bắt buộc "XAC NHAN"
}
