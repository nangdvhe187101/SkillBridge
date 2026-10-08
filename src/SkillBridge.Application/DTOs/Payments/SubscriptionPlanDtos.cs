using System;
using System.Collections.Generic;

namespace SkillBridge.Application.DTOs.Payments;

public class SubscriptionPlanConfigDto
{
    public int Id { get; set; }
    public string Code { get; set; } = null!;
    public string TargetRole { get; set; } = null!; // "student" | "employer"
    public string Name { get; set; } = null!;
    public string? Tagline { get; set; }
    public string? BadgeText { get; set; }
    public decimal Price { get; set; }
    public string? PriceSub { get; set; }
    public decimal CommissionRate { get; set; } // e.g. 0.05
    public int TierRank { get; set; }
    public int? MaxActiveJobs { get; set; }
    public int? MaxWeeklyApplications { get; set; }
    public int MaxCvFiles { get; set; }
    public int DefaultRevisionLimit { get; set; }
    public int FreeFeaturedPins { get; set; }
    public int FreeDirectInvites { get; set; }
    public List<string> Features { get; set; } = new();
    public bool IsActive { get; set; }
    public bool IsPopular { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateSubscriptionPlanConfigRequest
{
    public string Code { get; set; } = null!;
    public string TargetRole { get; set; } = null!; // "student" | "employer"
    public string Name { get; set; } = null!;
    public string? Tagline { get; set; }
    public string? BadgeText { get; set; }
    public decimal Price { get; set; }
    public string? PriceSub { get; set; }
    public decimal CommissionRate { get; set; }
    public int TierRank { get; set; } = 1;
    public int? MaxActiveJobs { get; set; }
    public int? MaxWeeklyApplications { get; set; }
    public int MaxCvFiles { get; set; } = 5;
    public int DefaultRevisionLimit { get; set; } = 2;
    public int FreeFeaturedPins { get; set; } = 0;
    public int FreeDirectInvites { get; set; } = 0;
    public List<string>? Features { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsPopular { get; set; } = false;
}

public class UpdateSubscriptionPlanConfigRequest
{
    public string Name { get; set; } = null!;
    public string? Tagline { get; set; }
    public string? BadgeText { get; set; }
    public decimal Price { get; set; }
    public string? PriceSub { get; set; }
    public decimal CommissionRate { get; set; }
    public int? TierRank { get; set; }
    public int? MaxActiveJobs { get; set; }
    public int? MaxWeeklyApplications { get; set; }
    public int? MaxCvFiles { get; set; }
    public int? DefaultRevisionLimit { get; set; }
    public int? FreeFeaturedPins { get; set; }
    public int? FreeDirectInvites { get; set; }
    public List<string>? Features { get; set; }
    public bool? IsActive { get; set; }
    public bool? IsPopular { get; set; }
}

public class PublicPlansGroupDto
{
    public List<SubscriptionPlanConfigDto> StudentPlans { get; set; } = new();
    public List<SubscriptionPlanConfigDto> EmployerPlans { get; set; } = new();
}
