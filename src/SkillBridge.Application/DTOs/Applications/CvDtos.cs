using System;

namespace SkillBridge.Application.DTOs.Applications;

public class CvFileDto
{
    public int Id { get; set; }
    public int StudentId { get; set; }
    public string FileName { get; set; } = null!;
    public string FileUrl { get; set; } = null!;
    public int FileSize { get; set; }
    public string? Label { get; set; }
    public int? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public bool IsSearchable { get; set; }
    public DateTime UploadedAt { get; set; }
}

public class UploadCvRequest
{
    public string FileName { get; set; } = null!;
    public string? FileUrl { get; set; }
    public string? Label { get; set; }
    public int? CategoryId { get; set; }
    public int FileSize { get; set; }
    public bool IsSearchable { get; set; } = true;
}
