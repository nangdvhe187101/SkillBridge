using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SkillBridge.Application.DTOs.Reviews;

public class CreateReviewRequest
{
    [Required(ErrorMessage = "Mã công việc không được để trống")]
    public int JobId { get; set; }

    [Range(1, 5, ErrorMessage = "Số sao đánh giá phải từ 1 đến 5 sao")]
    public int Stars { get; set; }

    [MaxLength(1000, ErrorMessage = "Nhận xét không được vượt quá 1000 ký tự")]
    public string? Comment { get; set; }
}

public class ReviewDto
{
    public int Id { get; set; }
    public int JobId { get; set; }
    public string JobTitle { get; set; } = string.Empty;
    public int ReviewerId { get; set; }
    public string ReviewerName { get; set; } = string.Empty;
    public string? ReviewerAvatar { get; set; }
    public int RevieweeId { get; set; }
    public string RevieweeName { get; set; } = string.Empty;
    public string? RevieweeAvatar { get; set; }
    public int Stars { get; set; }
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsFromEmployer { get; set; }
}

public class JobReviewsSummaryDto
{
    public int JobId { get; set; }
    public bool HasReviewed { get; set; }
    public ReviewDto? MyReview { get; set; }
    public List<ReviewDto> Reviews { get; set; } = new();
}
