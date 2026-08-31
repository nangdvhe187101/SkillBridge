using System;

namespace SkillBridge.Application.DTOs.Storage;

public class FileUploadResult
{
    public string FileKey { get; set; } = null!;
    public string FileUrl { get; set; } = null!;
    public string FileName { get; set; } = null!;
    public long FileSize { get; set; }
    public string ContentType { get; set; } = null!;
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}
