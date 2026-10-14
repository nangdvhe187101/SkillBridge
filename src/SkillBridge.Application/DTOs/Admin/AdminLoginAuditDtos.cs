using System;
using System.Collections.Generic;

namespace SkillBridge.Application.DTOs.Admin;

public class AdminLoginHistoryItemDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string RoleName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public string Method { get; set; } = "password";
    public DateTime LoginAt { get; set; }
}

public class AdminLoginHistoryPagedResultDto
{
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public List<AdminLoginHistoryItemDto> Items { get; set; } = new();
}

public class AdminLoginStatsDto
{
    public int TotalToday { get; set; }
    public int ActiveUsers24h { get; set; }
    public int StudentsToday { get; set; }
    public int EmployersToday { get; set; }
    public int AdminsToday { get; set; }
}
