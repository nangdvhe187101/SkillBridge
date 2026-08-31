using System;

namespace SkillBridge.Application.DTOs.Applications;

public class ApplyJobRequest
{
    public int JobId { get; set; }
    public int CvFileId { get; set; }
    public string? CoverLetter { get; set; }
}

public class JobApplicationResponseDto
{
    public int Id { get; set; }
    public int JobId { get; set; }
    public string JobTitle { get; set; } = null!;
    public string EmployerName { get; set; } = null!;
    public decimal Budget { get; set; }
    public int StudentId { get; set; }
    public int? CvFileId { get; set; }
    public string? CvFileName { get; set; }
    public string? CvFileUrl { get; set; }
    public string Status { get; set; } = null!;
    public DateTime AppliedAt { get; set; }
}

public class ApplicantItemDto
{
    public int ApplicationId { get; set; }
    public int StudentId { get; set; }
    public string StudentName { get; set; } = null!;
    public string? StudentAvatarUrl { get; set; }
    public string? School { get; set; }
    public int? CvFileId { get; set; }
    public string? CvFileName { get; set; }
    public string? CvFileUrl { get; set; }
    public string? CvLabel { get; set; }
    public string Status { get; set; } = null!;
    public DateTime AppliedAt { get; set; }
}
