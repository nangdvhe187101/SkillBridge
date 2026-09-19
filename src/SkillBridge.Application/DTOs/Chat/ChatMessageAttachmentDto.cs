namespace SkillBridge.Application.DTOs.Chat;

public class ChatMessageAttachmentDto
{
    public string FileUrl { get; set; } = string.Empty;
    public string FileKey { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
}
