using System;

namespace SkillBridge.Application.DTOs.Users;

public class UserProfileDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? PhoneNumber { get; set; }
    public string? AvatarUrl { get; set; }
    public string RoleCode { get; set; } = null!;
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

public class PortfolioItemDto
{
    public int Id { get; set; }
    public string FileName { get; set; } = null!;
    public string FileType { get; set; } = null!;
    public string? FileUrl { get; set; }
    public DateTime UploadedAt { get; set; }
}

public class UserBadgeItemDto
{
    public int Id { get; set; }
    public int BadgeId { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public string? CategoryName { get; set; }
    public string? GrantedReason { get; set; }
    public DateTime GrantedAt { get; set; }
}
