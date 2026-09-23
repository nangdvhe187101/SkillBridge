using System;
using System.Collections.Generic;
using System.IO;

namespace SkillBridge.Application.DTOs.Users;

public class SubmitKycRequest
{
    public string DocumentType { get; set; } = "student_card"; // "student_card" | "business_license"
    public string? StudentIdNumber { get; set; }
    public string? School { get; set; }
    public int? GraduationYear { get; set; }
    public string? TaxCode { get; set; }
    public string? CompanyName { get; set; }
}

public class KycFileUploadModel
{
    public required Stream FileStream { get; set; }
    public required string FileName { get; set; }
    public required string ContentType { get; set; }
    public long Length { get; set; }
    public string DocType { get; set; } = "student_card";
}

public class KycDocumentDto
{
    public int Id { get; set; }
    public string DocType { get; set; } = null!;
    public string FileName { get; set; } = null!;
    public string FileUrl { get; set; } = null!;
    public string FileType { get; set; } = null!;
    public int FileSize { get; set; }
    public DateTime UploadedAt { get; set; }
}

public class KycStatusResponse
{
    public string KycStatus { get; set; } = "unverified"; // "unverified" | "pending" | "verified" | "rejected" | "expired"
    public string? KycRejectionReason { get; set; }
    public DateTime? KycReviewedAt { get; set; }
    public string? StudentIdNumber { get; set; }
    public string? School { get; set; }
    public int? GraduationYear { get; set; }
    public DateTime? KycExpiresAt { get; set; }
    public string? TaxCode { get; set; }
    public string? CompanyName { get; set; }
    public int ReliabilityScore { get; set; }
    public List<KycDocumentDto> Documents { get; set; } = new();
}
