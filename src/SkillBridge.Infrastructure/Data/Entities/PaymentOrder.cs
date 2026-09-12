using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SkillBridge.Infrastructure.Data.Entities;

[Table("payment_orders")]
[Index(nameof(GatewayTransactionId), Name = "uq_payment_orders_gateway_txn", IsUnique = true)]
[Index(nameof(OrderCode), Name = "uq_payment_orders_order_code", IsUnique = true)]
[Index(nameof(UserId), nameof(CreatedAt), Name = "idx_payment_orders_user_created", IsDescending = new[] { false, true })]
[Index(nameof(Status), nameof(ExpiresAt), Name = "idx_payment_orders_status_expires")]
public partial class PaymentOrder
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("order_code")]
    [StringLength(64)]
    public string OrderCode { get; set; } = null!;

    [Column("provider")]
    [StringLength(32)]
    public string Provider { get; set; } = null!; // "VNPAY" | "SEPAY"

    [Column("amount")]
    [Precision(12, 0)]
    public decimal Amount { get; set; }

    [Column("status")]
    [StringLength(32)]
    public string Status { get; set; } = "pending"; // pending | paid | failed | expired | cancelled

    [Column("gateway_transaction_id")]
    [StringLength(100)]
    public string? GatewayTransactionId { get; set; }

    [Column("raw_webhook_payload", TypeName = "longtext")]
    public string? RawWebhookPayload { get; set; }

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [Column("expires_at", TypeName = "datetime")]
    public DateTime? ExpiresAt { get; set; }

    [Column("paid_at", TypeName = "datetime")]
    public DateTime? PaidAt { get; set; }

    [ForeignKey(nameof(UserId))]
    [InverseProperty(nameof(User.PaymentOrders))]
    public virtual User User { get; set; } = null!;
}
