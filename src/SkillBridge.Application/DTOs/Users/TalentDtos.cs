using System;
using System.Collections.Generic;

namespace SkillBridge.Application.DTOs.Users;

public class TalentFilterRequest
{
    public string? Keyword { get; set; }
    public string? School { get; set; }
    public string? Industry { get; set; }
    public string? Skill { get; set; }
    public List<string>? Skills { get; set; }
    public int? MinReliabilityScore { get; set; }
    public decimal? MinRate { get; set; }
    public decimal? MaxRate { get; set; }
    public bool? OnlyVerified { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 12;
}

public class TalentItemDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = null!;
    public string? AvatarUrl { get; set; }
    public string? School { get; set; }
    public string? Industry { get; set; }
    public string? CompanyDescription { get; set; } // Bio
    public int ReliabilityScore { get; set; }
    public int JobsDoneCount { get; set; }
    public decimal ExpectedRate { get; set; } = 100_000m;
    public string RateUnit { get; set; } = "đ/giờ";
    public string KycStatus { get; set; } = "verified";
    public bool IsStudentVerified { get; set; }
    public string? ActivePlanCode { get; set; }
    public int ActivePlanTier { get; set; }
    public DateTime JoinedAt { get; set; }
    public bool IsOnline { get; set; }
    public List<string> Skills { get; set; } = new();
}

public class InviteToJobRequest
{
    public int JobId { get; set; }
    public string? Message { get; set; }
}

public class InviteToJobResponseDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public DateTime InvitedAt { get; set; } = DateTime.UtcNow;
}
