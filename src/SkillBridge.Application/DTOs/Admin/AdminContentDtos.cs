using System;
using System.Collections.Generic;

namespace SkillBridge.Application.DTOs.Admin;

public class AdminModerationItemDto
{
    public int Id { get; set; }
    public int JobId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int EmployerId { get; set; }
    public string EmployerName { get; set; } = string.Empty;
    public string EmployerEmail { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public decimal Budget { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? FlagReason { get; set; }
    public string Risk { get; set; } = "low"; // 'high' | 'med' | 'low'
    public string Status { get; set; } = "pending"; // 'pending' | 'approved' | 'rejected'
    public DateTime SubmittedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public int? ReviewedBy { get; set; }
    public List<string> Attachments { get; set; } = new();
    public List<string> Requirements { get; set; } = new();
}

public class AdminModerationFilterRequest
{
    public string? Query { get; set; }
    public string? Risk { get; set; } // 'all' | 'high' | 'med' | 'low'
    public string? Status { get; set; } // 'all' | 'pending' | 'approved' | 'rejected'
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

public class AdminContentStatsDto
{
    public int PendingJobsCount { get; set; }
    public int HighRiskCount { get; set; }
    public int TotalCategoriesCount { get; set; }
    public int FeaturedRequestsCount { get; set; }
}

public class AdminApproveJobRequest
{
    public string? Note { get; set; }
}

public class AdminRejectJobRequest
{
    public string Reason { get; set; } = null!;
}

public class AdminWarnPosterRequest
{
    public string WarningMessage { get; set; } = null!;
}

public class AdminCategoryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int DefaultRevisionLimit { get; set; }
    public string PreviewStrategy { get; set; } = string.Empty;
    public int JobsCount { get; set; }
}

public class AdminCreateCategoryRequest
{
    public string Name { get; set; } = null!;
    public int DefaultRevisionLimit { get; set; } = 2;
    public string PreviewStrategy { get; set; } = "watermark_image";
}

public class AdminFeaturedItemDto
{
    public int Id { get; set; }
    public int JobId { get; set; }
    public string JobTitle { get; set; } = string.Empty;
    public string EmployerName { get; set; } = string.Empty;
    public string EmployerEmail { get; set; } = string.Empty;
    public decimal PaidAmount { get; set; }
    public string Status { get; set; } = "pending"; // 'pending' | 'approved' | 'rejected'
    public DateTime CreatedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
}
