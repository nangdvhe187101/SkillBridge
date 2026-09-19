using System.ComponentModel.DataAnnotations;

namespace SkillBridge.Application.DTOs.Chat;

public class SendMessageRequestDto
{
    public string? MessageText { get; set; }

    [MaxLength(255)]
    public string? AttachmentUrl { get; set; }

    [MaxLength(50)]
    public string? AttachmentType { get; set; }
}
