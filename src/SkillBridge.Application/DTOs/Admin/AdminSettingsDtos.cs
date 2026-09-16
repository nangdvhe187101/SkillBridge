using System;
using System.Collections.Generic;

namespace SkillBridge.Application.DTOs.Admin;

public class SystemSettingDto
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class SystemSettingsResponseDto
{
    public int AutoAcceptHours { get; set; } = 72;
    public int AutoCloseJobDays { get; set; } = 30;
    public int FeaturedDurationHours { get; set; } = 48;
    public bool EmailJobHiredEnabled { get; set; } = true;
    public bool EmailDeliverable72hEnabled { get; set; } = true;
    public bool EmailPayoutEnabled { get; set; } = true;
    public bool EmailDigest18hEnabled { get; set; } = true;
    public bool EmailVipMatchEnabled { get; set; } = true;
    public Dictionary<string, string> RawSettings { get; set; } = new();
}

public class UpdateSystemSettingsRequest
{
    public int? AutoAcceptHours { get; set; }
    public int? AutoCloseJobDays { get; set; }
    public int? FeaturedDurationHours { get; set; }
    public bool? EmailJobHiredEnabled { get; set; }
    public bool? EmailDeliverable72hEnabled { get; set; }
    public bool? EmailPayoutEnabled { get; set; }
    public bool? EmailDigest18hEnabled { get; set; }
    public bool? EmailVipMatchEnabled { get; set; }
    public Dictionary<string, string>? AdditionalSettings { get; set; }
}

public class TriggerActionResultDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public int AffectedCount { get; set; }
    public DateTime ExecutedAt { get; set; } = DateTime.UtcNow;
}
