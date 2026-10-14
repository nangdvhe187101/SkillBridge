using System;
using System.Collections.Generic;

namespace SkillBridge.Application.DTOs.Users;

public class AdminUserFilterRequest
{
    public string? Query { get; set; }
    public string? Role { get; set; } // 'all' | 'student' | 'employer'
    public string? Status { get; set; } // 'all' | 'active' | 'pending' | 'locked' | 'blacklisted'
    public string? SubTab { get; set; } // 'all' | 'kyc' | 'blacklist'
    public string? TimeRange { get; set; } // 'all' | '1d' | '7d' | '15d' | '30d' (hoặc '1m')
    public string? CvStatus { get; set; } // 'all' | 'has_cv' | 'no_cv'
    public string? VerificationStatus { get; set; } // 'all' | 'student_verified' | 'student_pending' | 'employer_verified' | 'employer_pending'
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

public class AdminUserListItemDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Role { get; set; } = string.Empty; // 'student' | 'employer' | 'admin'
    public string Status { get; set; } = string.Empty; // 'active' | 'pending' | 'locked' | 'blacklisted'
    public string Kyc { get; set; } = string.Empty; // 'pending' | 'verified' | 'rejected'
    public int Reliability { get; set; }
    public int JobsDone { get; set; }
    public string? School { get; set; }
    public string? StudentCode { get; set; }
    public string? Industry { get; set; }
    public string? AvatarUrl { get; set; }
    public bool HasCv { get; set; }
    public int CvCount { get; set; }
    public string? BlacklistReason { get; set; }
    public DateTime? BlacklistDate { get; set; }
    public DateTime JoinedAt { get; set; }
}

public class AdminUserCvDto
{
    public int Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public string? Label { get; set; }
    public int FileSize { get; set; }
    public string? CategoryName { get; set; }
    public DateTime UploadedAt { get; set; }
}

public class AdminUserDocumentDto
{
    public int Id { get; set; }
    public string DocType { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public int FileSize { get; set; }
    public DateTime UploadedAt { get; set; }
}

public class AdminUserDetailDto : AdminUserListItemDto
{
    public string? CompanySize { get; set; }
    public string? Website { get; set; }
    public string? CompanyDescription { get; set; }
    public int? KycReviewedBy { get; set; }
    public DateTime? KycReviewedAt { get; set; }
    public string? KycRejectionReason { get; set; }
    public string? UnmaskedPhone { get; set; }
    public string? UnmaskedIdCard { get; set; }
    public short? GraduationYear { get; set; }
    public int ActiveJobsCount { get; set; }
    public decimal WalletBalance { get; set; }
    public List<AdminUserCvDto> Cvs { get; set; } = new();
    public List<AdminUserDocumentDto> Documents { get; set; } = new();
    public List<AdminUserActivityHistoryDto> History { get; set; } = new();
}

public class AdminUserActivityHistoryDto
{
    public string Time { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
}

public class AdminAdjustReliabilityRequest
{
    public int Value { get; set; } // Điểm số mới (0 - 100)
    public string Note { get; set; } = null!; // Bắt buộc >= 10 ký tự căn cứ theo BR-ADM-07
}

public class AdminLockUserRequest
{
    public string? Reason { get; set; }
}

public class AdminBlacklistRequest
{
    public string Reason { get; set; } = null!; // Bắt buộc lý do theo BR-ADM-06
}

public class AdminUserStatsDto
{
    public int TotalUsers { get; set; }
    public int StudentsCount { get; set; }
    public int EmployersCount { get; set; }
    public int PendingKycCount { get; set; }
    public int BlacklistedCount { get; set; }
    public double AverageReliability { get; set; }
    public int NewUsers1d { get; set; }
    public int NewUsers7d { get; set; }
    public int NewUsers15d { get; set; }
    public int NewUsers30d { get; set; }
}
