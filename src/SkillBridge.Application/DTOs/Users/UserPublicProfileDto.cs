using System;
using System.Collections.Generic;

namespace SkillBridge.Application.DTOs.Users;

public class UserPublicProfileDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = null!;
    public string? AvatarUrl { get; set; }
    public string? CoverImageUrl { get; set; }
    public string? Headline { get; set; }
    public string? School { get; set; }
    public string? Industry { get; set; }
    public string? Bio { get; set; }
    public string RoleCode { get; set; } = null!;
    public int ReliabilityScore { get; set; } = 95;
    public int CompletedJobsCount { get; set; }
    public double AverageRating { get; set; } = 5.0;
    public int TotalReviewsCount { get; set; }
    public bool IsKycVerified { get; set; }
    public decimal? ExpectedHourlyRate { get; set; }
    public string? GraduationYear { get; set; }
    public DateTime JoinedAt { get; set; }
    public List<string> Skills { get; set; } = new();
    public List<EducationItemDto> Education { get; set; } = new();
    public List<ExperienceItemDto> Experiences { get; set; } = new();
    public SocialLinksDto SocialLinks { get; set; } = new();
    public List<PortfolioItemDto> Portfolios { get; set; } = new();
    public List<UserReviewItemDto> Reviews { get; set; } = new();
    public List<UserBadgeItemDto> Badges { get; set; } = new();
}

public class UserReviewItemDto
{
    public int Id { get; set; }
    public string ReviewerName { get; set; } = null!;
    public string? ReviewerAvatarUrl { get; set; }
    public string JobTitle { get; set; } = null!;
    public int Stars { get; set; }
    public string Comment { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
}
