using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("webhook_logs")]
[Index(nameof(Provider), nameof(CreatedAt), Name = "idx_webhook_logs_provider_created", IsDescending = new[] { false, true })]
[Index(nameof(ProcessedStatus), Name = "idx_webhook_logs_status")]
public partial class WebhookLog
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("provider")]
    [StringLength(32)]
    public string Provider { get; set; } = null!; // "VNPAY" | "SEPAY"

    [Column("http_method")]
    [StringLength(10)]
    public string HttpMethod { get; set; } = null!;

    [Column("request_url")]
    [StringLength(500)]
    public string RequestUrl { get; set; } = null!;

    [Column("raw_payload", TypeName = "longtext")]
    public string RawPayload { get; set; } = string.Empty;

    [Column("ip_address")]
    [StringLength(45)]
    public string? IpAddress { get; set; }

    [Column("is_valid_signature")]
    public bool IsValidSignature { get; set; }

    [Column("processed_status")]
    [StringLength(50)]
    public string ProcessedStatus { get; set; } = "pending"; // success | failed | invalid_signature | amount_mismatch | unmatched

    [Column("error_message")]
    [StringLength(500)]
    public string? ErrorMessage { get; set; }

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }
}
