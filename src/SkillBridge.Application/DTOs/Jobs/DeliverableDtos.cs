using System;
using System.Collections.Generic;

namespace SkillBridge.Application.DTOs.Jobs;

public class DeliverableDto
{
    public int Id { get; set; }
    public int JobId { get; set; }
    public int StudentId { get; set; }
    public string StudentName { get; set; } = null!;
    public int Version { get; set; }
    public string PreviewFileUrl { get; set; } = null!;
    public string? FinalFileUrl { get; set; }
    public string? ExternalUrl { get; set; }
    public string FileName { get; set; } = null!;
    public string FileType { get; set; } = null!;
    public string? Note { get; set; }
    public string Status { get; set; } = null!;
    public DateTime SubmittedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public List<DeliverableFeedbackDto> Feedbacks { get; set; } = new();
}

public class DeliverableFeedbackDto
{
    public int Id { get; set; }
    public int AuthorId { get; set; }
    public string AuthorName { get; set; } = null!;
    public string Content { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
}

public class SubmitDeliverableBinaryRequest
{
    public string? ExternalUrl { get; set; }
    public string? Note { get; set; }
}

public class ReviewDeliverableRequest
{
    public string Status { get; set; } = null!; // "accepted" or "revision_requested"
    public string? FeedbackComment { get; set; }
}
