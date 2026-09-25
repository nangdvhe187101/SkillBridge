using System;
using System.ComponentModel.DataAnnotations;

namespace SkillBridge.Application.DTOs.Reports;

public class CreateReportRequest
{
    [Required(ErrorMessage = "Loại đối tượng báo cáo không được để trống.")]
    [RegularExpression("^(job|user|conversation)$", ErrorMessage = "Loại đối tượng chỉ có thể là 'job', 'user' hoặc 'conversation'.")]
    public string TargetType { get; set; } = null!;

    public int? TargetId { get; set; }

    [Required(ErrorMessage = "Lý do báo cáo không được để trống.")]
    [StringLength(255, ErrorMessage = "Lý do báo cáo không được vượt quá 255 ký tự.")]
    public string Reason { get; set; } = null!;

    [StringLength(2000, ErrorMessage = "Mô tả chi tiết không được vượt quá 2000 ký tự.")]
    public string? Description { get; set; }
}

public class ReportResponse
{
    public int Id { get; set; }
    public int ReporterId { get; set; }
    public int? TargetUserId { get; set; }
    public int? TargetJobId { get; set; }
    public string Reason { get; set; } = null!;
    public string? Description { get; set; }
    public string Status { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
}
