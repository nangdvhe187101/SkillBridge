using System;

namespace SkillBridge.Application.DTOs.Users;

public class UserProfileDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? PhoneNumber { get; set; }
    public string? AvatarUrl { get; set; }
    public string RoleName { get; set; } = null!;
    public string? School { get; set; }
    public string? Industry { get; set; }
    public string? CompanySize { get; set; }
    public string? Website { get; set; }
    public string? CompanyDescription { get; set; }
    public string KycStatus { get; set; } = "pending";
    public string AccountStatus { get; set; } = "active";
    public int ReliabilityScore { get; set; }
    public int JobsDoneCount { get; set; }
    public string? ReferralCode { get; set; }
    public DateTime JoinedAt { get; set; }
}

public class UpdateUserProfileRequest
{
    public string? FullName { get; set; }
    public string? PhoneNumber { get; set; }
    public string? School { get; set; }
    public string? Industry { get; set; }
    public string? CompanySize { get; set; }
    public string? Website { get; set; }
    public string? CompanyDescription { get; set; }
}
