using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Interfaces.Payments;

namespace SkillBridge.Infrastructure.Services.Payments;

public class VnPayGatewayService : IVnPayGatewayService
{
    public string ProviderCode => "VNPAY";

    private readonly IConfiguration _config;
    private readonly ILogger<VnPayGatewayService> _logger;

    public VnPayGatewayService(IConfiguration config, ILogger<VnPayGatewayService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public string CreatePaymentUrl(string orderCode, decimal amount, string clientIp)
    {
        var tmnCode = _config["VnPay:TmnCode"];
        var hashSecret = _config["VnPay:HashSecret"];
        var baseUrl = _config["VnPay:BaseUrl"] ?? "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
        var returnUrl = _config["VnPay:ReturnUrl"] ?? "http://localhost:5247/api/payments/vnpay-return";

        if (string.IsNullOrWhiteSpace(hashSecret) || string.IsNullOrWhiteSpace(tmnCode))
        {
            _logger.LogError("VnPay chưa được cấu hình đầy đủ (TmnCode hoặc HashSecret bị thiếu).");
            throw new InvalidOperationException("Cổng thanh toán VNPay chưa được cấu hình.");
        }

        var now = DateTime.UtcNow.AddHours(7); // VNPay expects Vietnam Time (UTC+7)
        var createDate = now.ToString("yyyyMMddHHmmss", CultureInfo.InvariantCulture);
        var expireDate = now.AddMinutes(15).ToString("yyyyMMddHHmmss", CultureInfo.InvariantCulture);

        // VNPay amount is multiplied by 100
        var vnpAmount = ((long)(amount * 100)).ToString(CultureInfo.InvariantCulture);

        var vnpParams = new SortedDictionary<string, string>(StringComparer.Ordinal)
        {
            ["vnp_Version"] = "2.1.0",
            ["vnp_Command"] = "pay",
            ["vnp_TmnCode"] = tmnCode,
            ["vnp_Amount"] = vnpAmount,
            ["vnp_CurrCode"] = "VND",
            ["vnp_TxnRef"] = orderCode,
            ["vnp_OrderInfo"] = $"Nap tien vi SkillBridge {orderCode}",
            ["vnp_OrderType"] = "topup",
            ["vnp_Locale"] = "vn",
            ["vnp_ReturnUrl"] = returnUrl,
            ["vnp_IpAddr"] = string.IsNullOrWhiteSpace(clientIp) ? "127.0.0.1" : clientIp,
            ["vnp_CreateDate"] = createDate,
            ["vnp_ExpireDate"] = expireDate
        };

        // Chuẩn hóa UrlEncode theo thư viện chính thức của VNPay (khoảng trắng thành '+')
        var queryString = string.Join("&", vnpParams.Select(kv => $"{kv.Key}={WebUtility.UrlEncode(kv.Value)}"));
        var secureHash = ComputeHmacSha512(hashSecret, queryString);

        return $"{baseUrl}?{queryString}&vnp_SecureHash={secureHash}";
    }

    public VnPayProcessResult ProcessIpn(IDictionary<string, string> query)
    {
        var result = new VnPayProcessResult();
        var hashSecret = _config["VnPay:HashSecret"];

        if (string.IsNullOrWhiteSpace(hashSecret))
        {
            _logger.LogError("VnPay:HashSecret chưa được cấu hình. Từ chối xác thực IPN.");
            result.IsValidSignature = false;
            result.Message = "Cổng thanh toán chưa cấu hình HashSecret";
            return result;
        }

        if (!query.TryGetValue("vnp_SecureHash", out var receivedHash) || string.IsNullOrWhiteSpace(receivedHash))
        {
            result.IsValidSignature = false;
            result.Message = "Missing vnp_SecureHash";
            return result;
        }

        // VNPay query params to hash: everything except vnp_SecureHash and vnp_SecureHashType, sorted ordinal
        var filteredParams = query
            .Where(k => !string.Equals(k.Key, "vnp_SecureHash", StringComparison.OrdinalIgnoreCase) &&
                        !string.Equals(k.Key, "vnp_SecureHashType", StringComparison.OrdinalIgnoreCase))
            .OrderBy(k => k.Key, StringComparer.Ordinal)
            .ToList();

        // Hỗ trợ kiểm tra cả 2 chuẩn mã hóa ký số: WebUtility.UrlEncode ('+') và Uri.EscapeDataString ('%20')
        var rawDataUrlEncode = string.Join("&", filteredParams.Select(k => $"{k.Key}={WebUtility.UrlEncode(k.Value ?? string.Empty)}"));
        var computedHashUrlEncode = ComputeHmacSha512(hashSecret, rawDataUrlEncode);

        var rawDataEscape = string.Join("&", filteredParams.Select(k => $"{k.Key}={Uri.EscapeDataString(k.Value ?? string.Empty)}"));
        var computedHashEscape = ComputeHmacSha512(hashSecret, rawDataEscape);

        // Constant-time comparison to prevent timing attacks
        var receivedBytes = Encoding.UTF8.GetBytes(receivedHash.ToLowerInvariant());
        var hash1Bytes = Encoding.UTF8.GetBytes(computedHashUrlEncode.ToLowerInvariant());
        var hash2Bytes = Encoding.UTF8.GetBytes(computedHashEscape.ToLowerInvariant());

        var isValid = (receivedBytes.Length == hash1Bytes.Length && CryptographicOperations.FixedTimeEquals(receivedBytes, hash1Bytes))
                   || (receivedBytes.Length == hash2Bytes.Length && CryptographicOperations.FixedTimeEquals(receivedBytes, hash2Bytes));

        if (!isValid)
        {
            _logger.LogWarning("VNPay signature verification failed for IPN. Computed (+): {Computed1}, Computed (%20): {Computed2}, Received: {Received}",
                computedHashUrlEncode, computedHashEscape, receivedHash);
            result.IsValidSignature = false;
            result.Message = "Chữ ký không khớp";
            return result;
        }

        result.IsValidSignature = true;
        query.TryGetValue("vnp_TxnRef", out var txnRef);
        query.TryGetValue("vnp_TransactionNo", out var txnNo);
        query.TryGetValue("vnp_ResponseCode", out var responseCode);
        query.TryGetValue("vnp_Amount", out var amountStr);

        result.OrderCode = txnRef;
        result.GatewayTransactionNo = txnNo;
        result.ResponseCode = responseCode;

        if (decimal.TryParse(amountStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var rawAmount))
        {
            result.Amount = rawAmount / 100m;
        }

        result.IsSuccess = result.ResponseCode == "00";
        result.Message = result.IsSuccess ? "Giao dịch thành công" : $"Giao dịch thất bại (mã {result.ResponseCode})";

        return result;
    }

    public static string ComputeHmacSha512(string key, string data)
    {
        using var hmac = new HMACSHA512(Encoding.UTF8.GetBytes(key));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
