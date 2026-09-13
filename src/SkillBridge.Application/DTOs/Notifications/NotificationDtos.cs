using System;
using System.Collections.Generic;

namespace SkillBridge.Application.DTOs.Notifications;

public class NotificationDto
{
    public int Id { get; set; }
    public string? Icon { get; set; }
    public string MessageText { get; set; } = null!;
    public string? Link { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class PaginatedNotificationsDto
{
    public List<NotificationDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int UnreadCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
