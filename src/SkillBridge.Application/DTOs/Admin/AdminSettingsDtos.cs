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

    // CPC & Referral Settings
    public int CpcClickPrice { get; set; } = 2500;
    public bool ReferralProgramEnabled { get; set; } = true;
    public string ReferralRewardType { get; set; } = "trial_days"; // "trial_days" | "free_commission_count"
    public int ReferralRewardValue { get; set; } = 3; // 1, 2, 3 ngày hoặc 1, 3 lần miễn phí hoa hồng
    public string ReferralRewardTarget { get; set; } = "both"; // "both" | "student" | "employer"

    // Company & Contact Information
    public string CompanyName { get; set; } = "CÔNG TY CỔ PHẦN CÔNG NGHỆ SKILLBRIDGE VIỆT NAM";
    public string ProjectName { get; set; } = "Dự án Khởi nghiệp Sáng tạo Sinh viên · FPT University EXE Capstone Project";
    public string ProjectLead { get; set; } = "TRẦN LÊ KHÁNH LINH";
    public string ProjectLeadTitle { get; set; } = "Trưởng nhóm dự án (Project Lead)";
    public string TechLead { get; set; } = "ĐÀO VĂN NĂNG";
    public string TechLeadTitle { get; set; } = "Trưởng nhóm code (Technical Lead)";
    public string Address { get; set; } = "Trường Đại học FPT Hà Nội, Khu Công nghệ cao Hòa Lạc, Km29 Đại lộ Thăng Long, Huyện Thạch Thất, TP. Hà Nội, Việt Nam";
    public string Hotline1 { get; set; } = "0334404480";
    public string Hotline2 { get; set; } = "0956653307";
    public string Email { get; set; } = "skillbridge.vn@gmail.com";
    public string WorkingHours { get; set; } = "08:00 - 18:00 (Thứ 2 đến Thứ 7)";

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

    // CPC & Referral Settings
    public int? CpcClickPrice { get; set; }
    public bool? ReferralProgramEnabled { get; set; }
    public string? ReferralRewardType { get; set; }
    public int? ReferralRewardValue { get; set; }
    public string? ReferralRewardTarget { get; set; }

    // Company & Contact Information
    public string? CompanyName { get; set; }
    public string? ProjectName { get; set; }
    public string? ProjectLead { get; set; }
    public string? ProjectLeadTitle { get; set; }
    public string? TechLead { get; set; }
    public string? TechLeadTitle { get; set; }
    public string? Address { get; set; }
    public string? Hotline1 { get; set; }
    public string? Hotline2 { get; set; }
    public string? Email { get; set; }
    public string? WorkingHours { get; set; }

    public Dictionary<string, string>? AdditionalSettings { get; set; }
}

public class TriggerActionResultDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public int AffectedCount { get; set; }
    public DateTime ExecutedAt { get; set; } = DateTime.UtcNow;
}
