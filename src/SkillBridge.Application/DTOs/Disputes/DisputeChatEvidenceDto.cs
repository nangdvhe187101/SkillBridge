using System;
using System.Collections.Generic;
using SkillBridge.Application.DTOs.Chat;

namespace SkillBridge.Application.DTOs.Disputes;

public class DisputeChatEvidenceDto
{
    public int DisputeId { get; set; }
    public int JobId { get; set; }
    public string JobTitle { get; set; } = string.Empty;
    public string DisputeStatus { get; set; } = string.Empty;
    public string DisputeReason { get; set; } = string.Empty;
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public int EmployerId { get; set; }
    public string EmployerName { get; set; } = string.Empty;
    public int ConversationId { get; set; }
    public DateTime EvidenceAccessLoggedAt { get; set; }
    public List<ChatMessageDto> Messages { get; set; } = new();
}
