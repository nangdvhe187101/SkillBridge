using System;
using System.Text.Json.Serialization;

namespace SkillBridge.Application.DTOs.Payments;

public class CreatePaymentOrderRequest
{
    public string Provider { get; set; } = "SEPAY"; // "VNPAY" | "SEPAY"
    public decimal Amount { get; set; }
}

public class CreatePaymentOrderResponse
{
    public string OrderCode { get; set; } = null!;
    public string Provider { get; set; } = null!;
    public decimal Amount { get; set; }
    public string? PaymentUrl { get; set; }
    public string? QrCodeUrl { get; set; }
    public string? AccountNumber { get; set; }
    public string? BankCode { get; set; }
    public string? BankName { get; set; }
    public string? TransferContent { get; set; }
    public DateTime ExpiresAt { get; set; }
}

public class PaymentOrderStatusDto
{
    public string OrderCode { get; set; } = null!;
    public string Provider { get; set; } = null!;
    public decimal Amount { get; set; }
    public string Status { get; set; } = null!;
    public DateTime? PaidAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
}

public class VnPayIpnResponse
{
    public string RspCode { get; set; } = "99";
    public string Message { get; set; } = "Unknown error";

    public static VnPayIpnResponse Success() => new() { RspCode = "00", Message = "Confirm Success" };
    public static VnPayIpnResponse OrderNotFound() => new() { RspCode = "01", Message = "Order not found" };
    public static VnPayIpnResponse AlreadyConfirmed() => new() { RspCode = "02", Message = "Order already confirmed" };
    public static VnPayIpnResponse InvalidAmount() => new() { RspCode = "04", Message = "Invalid amount" };
    public static VnPayIpnResponse InvalidSignature() => new() { RspCode = "97", Message = "Invalid Checksum" };
    public static VnPayIpnResponse GeneralError(string msg = "Unspecified error") => new() { RspCode = "99", Message = msg };
}

public class SePayWebhookPayload
{
    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("gateway")]
    public string? Gateway { get; set; }

    [JsonPropertyName("transactionDate")]
    public string? TransactionDate { get; set; }

    [JsonPropertyName("accountNumber")]
    public string? AccountNumber { get; set; }

    [JsonPropertyName("subAccount")]
    public string? SubAccount { get; set; }

    [JsonPropertyName("code")]
    public string? Code { get; set; }

    [JsonPropertyName("content")]
    public string? Content { get; set; }

    [JsonPropertyName("transferType")]
    public string? TransferType { get; set; }

    [JsonPropertyName("transferAmount")]
    public decimal TransferAmount { get; set; }

    [JsonPropertyName("accumulated")]
    public decimal? Accumulated { get; set; }

    [JsonPropertyName("referenceCode")]
    public string? ReferenceCode { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }
}

public class ConfirmPaymentResult
{
    public bool Success { get; set; }
    public bool IsAlreadyProcessed { get; set; }
    public bool IsNotFound { get; set; }
    public bool IsAmountMismatch { get; set; }
    public bool IsInvalidSignature { get; set; }
    public string Message { get; set; } = string.Empty;

    public static ConfirmPaymentResult Succeeded() => new() { Success = true, Message = "Thanh toán thành công." };
    public static ConfirmPaymentResult AlreadyProcessed() => new() { Success = true, IsAlreadyProcessed = true, Message = "Đơn hàng đã được xử lý trước đó." };
    public static ConfirmPaymentResult NotFound(string msg = "Không tìm thấy đơn hàng.") => new() { Success = false, IsNotFound = true, Message = msg };
    public static ConfirmPaymentResult AmountMismatch(string msg = "Số tiền thanh toán không khớp.") => new() { Success = false, IsAmountMismatch = true, Message = msg };
    public static ConfirmPaymentResult InvalidSignature(string msg = "Chữ ký hoặc mã xác thực không hợp lệ.") => new() { Success = false, IsInvalidSignature = true, Message = msg };
    public static ConfirmPaymentResult Failed(string msg) => new() { Success = false, Message = msg };
}
