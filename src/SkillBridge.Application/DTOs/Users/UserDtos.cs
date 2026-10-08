using System;
using System.Collections.Generic;

namespace SkillBridge.Application.DTOs.Users;

public class EducationItemDto
{
    public string School { get; set; } = string.Empty;
    public string? Degree { get; set; }
    public string? FieldOfStudy { get; set; }
    public int? StartYear { get; set; }
    public int? EndYear { get; set; }
}

public class ExperienceItemDto
{
    public string Role { get; set; } = string.Empty;
    public string Company { get; set; } = string.Empty;
    public string? Period { get; set; }
    public string? Description { get; set; }
}

public class SocialLinksDto
{
    public string? Github { get; set; }
    public string? Linkedin { get; set; }
    public string? Behance { get; set; }
    public string? Facebook { get; set; }
    public string? Website { get; set; }
}

public class UserProfileDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? PhoneNumber { get; set; }
    public string? AvatarUrl { get; set; }
    public string? CoverImageUrl { get; set; }
    public string? Headline { get; set; }
    public string? Bio { get; set; }
    public string RoleCode { get; set; } = null!;
    public string RoleName { get; set; } = null!;
    public string? School { get; set; }
    public int? SchoolId { get; set; }
    public string? StudentCode { get; set; }
    public short? GraduationYear { get; set; }
    public string? Industry { get; set; }
    public string? CompanySize { get; set; }
    public string? Website { get; set; }
    public string? CompanyDescription { get; set; }
    public string? TaxCode { get; set; }
    public string? Representative { get; set; }
    public string? Address { get; set; }
    public string KycStatus { get; set; } = "pending";
    public string AccountStatus { get; set; } = "active";
    public int ReliabilityScore { get; set; }
    public int JobsDoneCount { get; set; }
    public decimal? ExpectedHourlyRate { get; set; }
    public string? ReferralCode { get; set; }
    public DateTime JoinedAt { get; set; }
    public bool HasPassword { get; set; } = true;
    public List<string> Skills { get; set; } = new();
    public List<EducationItemDto> Education { get; set; } = new();
    public List<ExperienceItemDto> Experiences { get; set; } = new();
    public SocialLinksDto SocialLinks { get; set; } = new();
    public List<string> Benefits { get; set; } = new();
    public List<string> OfficeImages { get; set; } = new();
}

public class UpdateUserProfileRequest
{
    public string? FullName { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Headline { get; set; }
    public string? Bio { get; set; }
    public decimal? ExpectedHourlyRate { get; set; }
    public string? School { get; set; }
    public int? SchoolId { get; set; }
    public string? StudentCode { get; set; }
    public short? GraduationYear { get; set; }
    public string? Industry { get; set; }
    public string? CompanySize { get; set; }
    public string? Website { get; set; }
    public string? CompanyDescription { get; set; }
    public string? TaxCode { get; set; }
    public string? Representative { get; set; }
    public string? Address { get; set; }
    public string? CoverImageUrl { get; set; }
    public List<string>? Skills { get; set; }
    public List<EducationItemDto>? Education { get; set; }
    public List<ExperienceItemDto>? Experiences { get; set; }
    public SocialLinksDto? SocialLinks { get; set; }
    public List<string>? Benefits { get; set; }
    public List<string>? OfficeImages { get; set; }
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

public class CompanyPublicProfileDto
{
    public int Id { get; set; }
    public string CompanyName { get; set; } = null!;
    public string? Representative { get; set; }
    public string? TaxCode { get; set; }
    public string? Industry { get; set; }
    public string? CompanySize { get; set; }
    public string? Website { get; set; }
    public string? Address { get; set; }
    public string? AvatarUrl { get; set; }
    public string? CoverImageUrl { get; set; }
    public string? CompanyDescription { get; set; }
    public string? Bio { get; set; }
    public string? Headline { get; set; }
    public string KycStatus { get; set; } = "pending";
    public int ReliabilityScore { get; set; } = 100;
    public int OpenJobsCount { get; set; }
    public int TotalHiredCount { get; set; }
    public double AverageRating { get; set; } = 5.0;
    public int TotalReviewsCount { get; set; }
    public DateTime JoinedAt { get; set; }
    public List<string> Benefits { get; set; } = new();
    public List<string> OfficeImages { get; set; } = new();
    public SocialLinksDto SocialLinks { get; set; } = new();
    public List<CompanyJobItemDto> OpenJobs { get; set; } = new();
    public List<UserReviewItemDto> Reviews { get; set; } = new();
}

public class CompanyJobItemDto
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string CategoryName { get; set; } = null!;
    public decimal Budget { get; set; }
    public string? Location { get; set; }
    public bool IsUrgent { get; set; }
    public bool IsFeatured { get; set; }
    public DateTime? DeadlineAt { get; set; }
    public DateTime PostedAt { get; set; }
    public int ApplicationsCount { get; set; }
}
