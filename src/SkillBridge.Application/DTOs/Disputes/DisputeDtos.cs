using System;
using System.Collections.Generic;
using System.IO;

namespace SkillBridge.Application.DTOs.Disputes;

public class DisputeFileUploadModel
{
    public Stream Stream { get; set; } = null!;
    public string FileName { get; set; } = null!;
    public string ContentType { get; set; } = null!;
    public string? Description { get; set; }
}

public class CreateDisputeRequest
{
    public int JobId { get; set; }
    public string Reason { get; set; } = null!;
    public string? Origin { get; set; } = "manual"; // 'manual' | 'revision_limit_exceeded'
    public int? DeliverableId { get; set; }
    public List<DisputeFileUploadModel>? Files { get; set; }
}

public class AddEvidenceRequest
{
    public string Description { get; set; } = null!;
    public Stream Stream { get; set; } = null!;
    public string FileName { get; set; } = null!;
    public string ContentType { get; set; } = null!;
}

public class ResolveDisputeRequest
{
    /// <summary>
    /// Quyết định: 'accept' (chấp thuận sinh viên - giải ngân 100%),
    /// 'reject' (chấp thuận NTD - hoàn cọc 100%),
    /// 'split' (phân chia tỷ lệ theo student_split_percent)
    /// </summary>
    public string Decision { get; set; } = null!;

    /// <summary>
    /// Tỷ lệ phần trăm giải ngân cho sinh viên khi Decision == 'split' (0 - 100)
    /// </summary>
    public decimal? StudentSplitPercent { get; set; }

    public string? AdminNote { get; set; }
}

public class DisputeEvidenceDto
{
    public int Id { get; set; }
    public int DisputeId { get; set; }
    public int UploadedByUserId { get; set; }
    public string UploadedByName { get; set; } = string.Empty;
    public string UploadedByRole { get; set; } = string.Empty;
    public string FileUrl { get; set; } = null!;
    public string FileType { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime UploadedAt { get; set; }
}

public class DisputeDto
{
    public int Id { get; set; }
    public int JobId { get; set; }
    public string JobTitle { get; set; } = string.Empty;
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public int EmployerId { get; set; }
    public string EmployerName { get; set; } = string.Empty;
    public int? DeliverableId { get; set; }
    public decimal Amount { get; set; }
    public string FiledBy { get; set; } = null!;
    public string Origin { get; set; } = null!;
    public string Reason { get; set; } = null!;
    public string Status { get; set; } = null!;
    public string? Decision { get; set; }
    public decimal? PayoutAmount { get; set; }
    public string? PayoutToRole { get; set; }
    public string? ResolvedNote { get; set; }
    public DateTime FiledAt { get; set; }
    public DateTime DeadlineAt72h { get; set; }
    public bool CanSubmitEvidence { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public int? ResolvedBy { get; set; }
    public string? ResolvedByName { get; set; }
    public int EvidenceCount { get; set; }
}

public class DisputeDetailDto : DisputeDto
{
    public List<DisputeEvidenceDto> Evidences { get; set; } = new();
}
