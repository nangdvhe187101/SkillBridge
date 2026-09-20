using System.ComponentModel.DataAnnotations;

namespace SkillBridge.Application.DTOs.Chat;

public class ReportConversationRequestDto
{
    [Required(ErrorMessage = "Lý do báo cáo không được để trống.")]
    [MaxLength(255, ErrorMessage = "Lý do báo cáo không được vượt quá 255 ký tự.")]
    public string Reason { get; set; } = null!;

    public string? Description { get; set; }
}
