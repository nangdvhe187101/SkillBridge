using System;
using System.Collections.Generic;

namespace SkillBridge.Application.DTOs.Jobs;

public class CreateJobRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int CategoryId { get; set; }
    public string? Location { get; set; }
    public decimal Budget { get; set; }
    public bool IsUrgent { get; set; }
    public DateTime? DeadlineAt { get; set; }
    public int? RevisionLimit { get; set; }
    public List<string> Requirements { get; set; } = new();
}

public class UpdateJobRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int CategoryId { get; set; }
    public string? Location { get; set; }
    public decimal Budget { get; set; }
    public bool IsUrgent { get; set; }
    public DateTime? DeadlineAt { get; set; }
    public int? RevisionLimit { get; set; }
    public List<string> Requirements { get; set; } = new();
}

public class JobRequirementDto
{
    public int Id { get; set; }
    public string RequirementText { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}

public class JobSummaryDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Location { get; set; }
    public decimal Budget { get; set; }
    public bool IsUrgent { get; set; }
    public bool IsFeatured { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime PostedAt { get; set; }
    public DateTime? DeadlineAt { get; set; }
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public int EmployerId { get; set; }
    public string EmployerName { get; set; } = string.Empty;
    public string? EmployerAvatar { get; set; }
    public bool IsSaved { get; set; }
}

public class JobDetailDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? Location { get; set; }
    public decimal Budget { get; set; }
    public bool IsUrgent { get; set; }
    public bool IsFeatured { get; set; }
    public string Status { get; set; } = string.Empty;
    public int RevisionLimit { get; set; }
    public DateTime PostedAt { get; set; }
    public DateTime? DeadlineAt { get; set; }
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public int EmployerId { get; set; }
    public string EmployerName { get; set; } = string.Empty;
    public string? EmployerAvatar { get; set; }
    public string? EmployerCompanyDescription { get; set; }
    public string? EmployerIndustry { get; set; }
    public string? EmployerCompanySize { get; set; }
    public string? EmployerWebsite { get; set; }
    public int EmployerReliabilityScore { get; set; }
    public bool IsSaved { get; set; }
    public List<JobRequirementDto> Requirements { get; set; } = new();
}

public class JobQueryParameters
{
    public int? CategoryId { get; set; }
    public string? Location { get; set; }
    public decimal? MinBudget { get; set; }
    public decimal? MaxBudget { get; set; }
    public bool? IsUrgent { get; set; }
    public string? Search { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? Sort { get; set; } // "newest", "budget_asc", "budget_desc"
}

public class PagedResult<T>
{
    public IReadOnlyList<T> Items { get; set; } = Array.Empty<T>();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
}
