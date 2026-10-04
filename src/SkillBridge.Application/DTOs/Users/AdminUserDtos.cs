using System;
using System.Collections.Generic;

namespace SkillBridge.Application.DTOs.Users;

public class AdminUserFilterRequest
{
    public string? Query { get; set; }
    public string? Role { get; set; } // 'all' | 'student' | 'employer'
    public string? Status { get; set; } // 'all' | 'active' | 'pending' | 'locked' | 'blacklisted'
    public string? SubTab { get; set; } // 'all' | 'kyc' | 'blacklist'
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
    public string? Industry { get; set; }
    public string? AvatarUrl { get; set; }
    public string? BlacklistReason { get; set; }
    public DateTime? BlacklistDate { get; set; }
    public DateTime JoinedAt { get; set; }
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
    public int ActiveJobsCount { get; set; }
    public decimal WalletBalance { get; set; }
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
}
