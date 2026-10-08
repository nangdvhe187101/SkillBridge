using System.Collections.Generic;

namespace SkillBridge.Application.DTOs.Admin;

public class AdminAnalyticsOverviewDto
{
    // User Metrics
    public int TotalUsers { get; set; }
    public int StudentsCount { get; set; }
    public int EmployersCount { get; set; }
    public int VerifiedKycCount { get; set; }
    public int PendingKycCount { get; set; }

    // Job & Matching Metrics
    public int TotalJobs { get; set; }
    public int OpenJobsCount { get; set; }
    public int InProgressJobsCount { get; set; }
    public int CompletedJobsCount { get; set; }
    public int CancelledJobsCount { get; set; }
    public double CompletionRate { get; set; } // Tỷ lệ hoàn thành %

    // Financial & Escrow Metrics
    public decimal TotalEscrowVolume { get; set; }
    public decimal TotalWalletBalances { get; set; }

    // Top Schools
    public List<AdminSchoolStatDto> TopSchools { get; set; } = new();

    // Job Status Breakdown
    public List<AdminJobStatusBreakdownDto> JobStatusBreakdown { get; set; } = new();
}

public class AdminSchoolStatDto
{
    public string SchoolName { get; set; } = string.Empty;
    public int StudentCount { get; set; }
    public double Percentage { get; set; }
}

public class AdminJobStatusBreakdownDto
{
    public string Status { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int Count { get; set; }
    public double Percentage { get; set; }
    public string Color { get; set; } = string.Empty;
}
