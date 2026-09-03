using System;

namespace SkillBridge.Application.DTOs.Applications;

public class ApplyJobRequest
{
    public int JobId { get; set; }
    public int CvFileId { get; set; }
    public string? CoverLetter { get; set; }
}

public class CancelApplicationRequest
{
    public string? Reason { get; set; }
}

public class JobApplicationResponseDto
{
    public int Id { get; set; }
    public int JobId { get; set; }
    public string JobTitle { get; set; } = null!;
    public string EmployerName { get; set; } = null!;
    public string? EmployerAvatarUrl { get; set; }
    public decimal Budget { get; set; }
    public int StudentId { get; set; }
    public int? CvFileId { get; set; }
    public string? CvFileName { get; set; }
    public string? CvFileUrl { get; set; }
    public string? CoverLetter { get; set; }
    public string Status { get; set; } = null!;
    public DateTime AppliedAt { get; set; }
    public string? JobStatus { get; set; }
    public DateTime? DeadlineAt { get; set; }
    public int RevisionLimit { get; set; }
    public int RevisionCount { get; set; }
}

public class ApplicantItemDto
{
    public int ApplicationId { get; set; }
    public int StudentId { get; set; }
    public string StudentName { get; set; } = null!;
    public string? StudentEmail { get; set; }
    public string? StudentPhone { get; set; }
    public string? StudentAvatarUrl { get; set; }
    public string? School { get; set; }
    public int ReliabilityScore { get; set; } = 95;
    public int JobsDoneCount { get; set; }
    public string? KycStatus { get; set; }
    public int? CvFileId { get; set; }
    public string? CvFileName { get; set; }
    public string? CvFileUrl { get; set; }
    public string? CvLabel { get; set; }
    public string? CoverLetter { get; set; }
    public string Status { get; set; } = null!;
    public DateTime AppliedAt { get; set; }
}

public class HireApplicantRequest
{
    public int? Days { get; set; }
}

public class HireApplicantResultDto
{
    public int JobId { get; set; }
    public int ApplicationId { get; set; }
    public int HiredStudentId { get; set; }
    public string HiredStudentName { get; set; } = null!;
    public string JobStatus { get; set; } = null!;
    public DateTime? DeadlineAt { get; set; }
    public decimal EscrowAmount { get; set; }
}
