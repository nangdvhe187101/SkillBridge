using System;
using System.ComponentModel.DataAnnotations;

namespace SkillBridge.Application.DTOs.Jobs;

public class CreateDeadlineExtensionRequest
{
    [Required(ErrorMessage = "Số ngày gia hạn không được để trống.")]
    [Range(1, 14, ErrorMessage = "Số ngày gia hạn phải từ 1 đến 14 ngày.")]
    public int AdditionalDays { get; set; }

    [Required(ErrorMessage = "Vui lòng chọn danh mục lý do gia hạn.")]
    [MaxLength(100)]
    public string ReasonCategory { get; set; } = null!;

    [Required(ErrorMessage = "Vui lòng nêu rõ lý do giải trình chi tiết.")]
    [MinLength(10, ErrorMessage = "Lý do giải trình tối thiểu 10 ký tự.")]
    [MaxLength(1000, ErrorMessage = "Lý do giải trình không vượt quá 1000 ký tự.")]
    public string DetailReason { get; set; } = null!;
}

public class RespondDeadlineExtensionRequest
{
    [Required(ErrorMessage = "Hành động phê duyệt không được để trống.")]
    [RegularExpression("^(accept|reject)$", ErrorMessage = "Hành động chỉ có thể là 'accept' hoặc 'reject'.")]
    public string Action { get; set; } = null!;

    [MaxLength(500, ErrorMessage = "Lý do từ chối không vượt quá 500 ký tự.")]
    public string? RejectionReason { get; set; }
}

public class DeadlineExtensionResponse
{
    public int Id { get; set; }
    public int JobId { get; set; }
    public string JobTitle { get; set; } = null!;
    public int StudentId { get; set; }
    public string StudentName { get; set; } = null!;
    public string? StudentAvatarUrl { get; set; }
    public int AdditionalDays { get; set; }
    public DateTime CurrentDeadline { get; set; }
    public DateTime ProposedDeadline { get; set; }
    public string ReasonCategory { get; set; } = null!;
    public string DetailReason { get; set; } = null!;
    public string Status { get; set; } = null!;
    public string? RejectionReason { get; set; }
    public DateTime RequestedAt { get; set; }
    public DateTime? RespondedAt { get; set; }
    public int? RespondedByUserId { get; set; }
    public string? RespondedByUserName { get; set; }
    public int MaxAllowedDays { get; set; }
    public int RemainingExtensionAttempts { get; set; }
}
