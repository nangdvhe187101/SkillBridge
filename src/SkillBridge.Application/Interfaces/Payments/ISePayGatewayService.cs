using SkillBridge.Application.DTOs.Payments;

namespace SkillBridge.Application.Interfaces.Payments;

public class SePayProcessResult
{
    public bool IsValidApiKey { get; set; }
    public bool IsSuccess { get; set; }
    public string? OrderCode { get; set; }
    public string? GatewayTransactionId { get; set; }
    public decimal Amount { get; set; }
    public string? Message { get; set; }
}

public interface ISePayGatewayService
{
    string ProviderCode { get; }
    string GenerateVietQrUrl(string orderCode, decimal amount);
    (string AccountNumber, string BankCode, string BankName) GetBankInfo();
    string? ExtractOrderCode(string? content);
    SePayProcessResult ProcessWebhook(string? authHeader, string rawPayload);
}
