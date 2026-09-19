using System;

namespace SkillBridge.Application.DTOs.Chat;

public class ConversationDto
{
    public int Id { get; set; }
    public int UserAId { get; set; }
    public int UserBId { get; set; }
    public int OtherUserId { get; set; }
    public string OtherUserName { get; set; } = string.Empty;
    public string? OtherUserAvatar { get; set; }
    public string? OtherUserRole { get; set; }
    public int? JobId { get; set; }
    public string? JobTitle { get; set; }
    public decimal? JobBudget { get; set; }
    public string? OtherUserSchool { get; set; }
    public int? OtherUserReliability { get; set; }
    public int? OtherUserJobsDone { get; set; }
    public double? OtherUserRating { get; set; }
    public int OtherUserReviewCount { get; set; }
    public DateTime? LastMessageAt { get; set; }
    public string? LastMessageText { get; set; }
    public int UnreadCount { get; set; }
    public bool IsOnline { get; set; }
    public DateTime CreatedAt { get; set; }

    // Nghiệp vụ 1: Vòng đời Job & Grace Period
    public bool IsReadOnly { get; set; }
    public string? ReadOnlyReason { get; set; }
    public string? StatusBannerMessage { get; set; }
    public DateTime? GracePeriodExpiresAt { get; set; }

    // Nghiệp vụ 2: Soft Archive cá nhân
    public bool IsArchived { get; set; }

    // Nghiệp vụ 3: Phân loại Tab Yêu cầu vs Trò chuyện
    public string RequestStatus { get; set; } = "active"; // "active" | "pending" | "declined"
    public bool IsRequestSender { get; set; }
    public int? RequestInitiatedBy { get; set; }
}
