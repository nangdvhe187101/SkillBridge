using System.ComponentModel.DataAnnotations;

namespace SkillBridge.Application.DTOs.Chat;

public class SendMessageRequestDto
{
    [StringLength(2000, ErrorMessage = "Nội dung tin nhắn không được quá 2000 ký tự")]
    public string? MessageText { get; set; }

    [MaxLength(255)]
    public string? AttachmentUrl { get; set; }

    [MaxLength(50)]
    public string? AttachmentType { get; set; }
}
