using System.ComponentModel.DataAnnotations;

namespace SkillBridge.Application.DTOs.Chat;

public class StartConversationRequestDto
{
    [Required]
    [Range(1, int.MaxValue, ErrorMessage = "Mã người dùng không hợp lệ.")]
    public int TargetUserId { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Mã công việc không hợp lệ.")]
    public int? JobId { get; set; }
}

public class ToggleArchiveRequestDto
{
    public bool Archive { get; set; } = true;
}
