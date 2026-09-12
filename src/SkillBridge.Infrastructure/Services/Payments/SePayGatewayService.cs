using System;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.DTOs.Payments;
using SkillBridge.Application.Interfaces.Payments;

namespace SkillBridge.Infrastructure.Services.Payments;

public class SePayGatewayService : ISePayGatewayService
{
    public string ProviderCode => "SEPAY";

    private readonly IConfiguration _config;
    private readonly ILogger<SePayGatewayService> _logger;
    private static readonly Regex OrderCodeRegex = new(@"\b(SB\d{14,24})\b", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public SePayGatewayService(IConfiguration config, ILogger<SePayGatewayService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public (string AccountNumber, string BankCode, string BankName) GetBankInfo()
    {
        var acc = _config["SePay:AccountNumber"] ?? "00000807297";
        var bank = _config["SePay:BankCode"] ?? "TPBank";
        var name = _config["SePay:AccountName"] ?? "DAO VAN NANG";
        return (acc, bank, name);
    }

    public string GenerateVietQrUrl(string orderCode, decimal amount)
    {
        var (acc, bank, _) = GetBankInfo();
        var roundedAmount = (long)amount;
        var encodedDes = Uri.EscapeDataString(orderCode);

        // SePay VietQR template URL
        return $"https://qr.sepay.vn/img?acc={acc}&bank={bank}&amount={roundedAmount}&des={encodedDes}";
    }

    public string? ExtractOrderCode(string? content)
    {
        if (string.IsNullOrWhiteSpace(content)) return null;

        var match = OrderCodeRegex.Match(content);
        return match.Success ? match.Groups[1].Value.ToUpperInvariant() : null;
    }

    public SePayProcessResult ProcessWebhook(string? authHeader, string rawPayload)
    {
        var result = new SePayProcessResult();
        var configuredApiKey = _config["SePay:ApiKey"] ?? "TEST_SEPAY_API_KEY_00000000";
        var expectedHeader = $"Apikey {configuredApiKey}";

        if (string.IsNullOrWhiteSpace(authHeader))
        {
            result.IsValidApiKey = false;
            result.Message = "Missing Authorization header";
            return result;
        }

        // Constant-time compare for Authorization header
        var authBytes = Encoding.UTF8.GetBytes(authHeader.Trim());
        var expectedBytes = Encoding.UTF8.GetBytes(expectedHeader.Trim());

        if (authBytes.Length != expectedBytes.Length || !CryptographicOperations.FixedTimeEquals(authBytes, expectedBytes))
        {
            _logger.LogWarning("SePay webhook API Key verification failed.");
            result.IsValidApiKey = false;
            result.Message = "API Key không hợp lệ";
            return result;
        }

        result.IsValidApiKey = true;

        if (string.IsNullOrWhiteSpace(rawPayload))
        {
            result.Message = "Empty payload";
            return result;
        }

        try
        {
            var payload = JsonSerializer.Deserialize<SePayWebhookPayload>(rawPayload, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (payload == null)
            {
                result.Message = "Không thể parse JSON payload";
                return result;
            }

            // SePay: parse order code from transaction content (narrative) or fallback to code
            var orderCode = ExtractOrderCode(payload.Content) ?? ExtractOrderCode(payload.Code);
            if (string.IsNullOrWhiteSpace(orderCode))
            {
                _logger.LogWarning("SePay webhook: Không tìm thấy orderCode trong content: '{Content}'", payload.Content);
                result.Message = $"Không tìm thấy mã đơn hàng trong nội dung chuyển khoản: {payload.Content}";
                result.IsSuccess = false;
                result.GatewayTransactionId = payload.Id.ToString(CultureInfo.InvariantCulture);
                result.Amount = payload.TransferAmount;
                return result;
            }

            result.OrderCode = orderCode;
            result.GatewayTransactionId = payload.Id.ToString(CultureInfo.InvariantCulture);
            result.Amount = payload.TransferAmount;
            result.IsSuccess = true;
            result.Message = "Webhook SePay hợp lệ";
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi parse payload SePay webhook.");
            result.Message = $"Lỗi parse payload: {ex.Message}";
            return result;
        }
    }
}
