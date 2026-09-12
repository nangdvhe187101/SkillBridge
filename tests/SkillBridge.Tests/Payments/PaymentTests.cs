using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using SkillBridge.Infrastructure.Services.Payments;
using Xunit;

namespace SkillBridge.Tests.Payments;

public class PaymentTests
{
    private readonly IConfiguration _config;
    private readonly Mock<ILogger<VnPayGatewayService>> _vnPayLoggerMock = new();
    private readonly Mock<ILogger<SePayGatewayService>> _sePayLoggerMock = new();

    public PaymentTests()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            ["VnPay:TmnCode"] = "SBTEST01",
            ["VnPay:HashSecret"] = "MYSECRETKEYVNPAY1234567890ABCDEF",
            ["VnPay:BaseUrl"] = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
            ["VnPay:ReturnUrl"] = "http://localhost:5247/api/payments/vnpay-return",
            ["SePay:ApiKey"] = "SEPAY_TEST_API_KEY_123456789",
            ["SePay:AccountNumber"] = "0987654321",
            ["SePay:BankCode"] = "MBBank",
            ["SePay:AccountName"] = "SKILLBRIDGE CO LTD"
        };

        _config = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();
    }

    [Fact]
    public void VnPay_CreatePaymentUrl_ShouldIncludeSortedParamsAndCorrectHash()
    {
        // Arrange
        var service = new VnPayGatewayService(_config, _vnPayLoggerMock.Object);
        var orderCode = "SB202609121200001";
        var amount = 150000m;
        var clientIp = "127.0.0.1";

        // Act
        var url = service.CreatePaymentUrl(orderCode, amount, clientIp);

        // Assert
        Assert.NotNull(url);
        Assert.StartsWith("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?", url);
        Assert.Contains("vnp_Amount=15000000", url); // Scaled x100
        Assert.Contains("vnp_Command=pay", url);
        Assert.Contains("vnp_TxnRef=" + orderCode, url);
        Assert.Contains("vnp_SecureHash=", url);
    }

    [Fact]
    public void VnPay_ProcessIpn_ValidSignature_ShouldReturnSuccess()
    {
        // Arrange
        var service = new VnPayGatewayService(_config, _vnPayLoggerMock.Object);
        var hashSecret = "MYSECRETKEYVNPAY1234567890ABCDEF";

        var queryParams = new SortedDictionary<string, string>(StringComparer.Ordinal)
        {
            ["vnp_Amount"] = "20000000", // 200,000 VND
            ["vnp_BankCode"] = "NCB",
            ["vnp_BankTranNo"] = "VNP14088921",
            ["vnp_CardType"] = "ATM",
            ["vnp_OrderInfo"] = "Nap tien vi SkillBridge SB202609121200001",
            ["vnp_PayDate"] = "20260912120500",
            ["vnp_ResponseCode"] = "00",
            ["vnp_TmnCode"] = "SBTEST01",
            ["vnp_TransactionNo"] = "14088921",
            ["vnp_TransactionStatus"] = "00",
            ["vnp_TxnRef"] = "SB202609121200001"
        };

        var rawData = string.Join("&", queryParams.Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value)}"));
        var secureHash = VnPayGatewayService.ComputeHmacSha512(hashSecret, rawData);

        var requestQuery = new Dictionary<string, string>(queryParams)
        {
            ["vnp_SecureHash"] = secureHash
        };

        // Act
        var result = service.ProcessIpn(requestQuery);

        // Assert
        Assert.True(result.IsValidSignature);
        Assert.True(result.IsSuccess);
        Assert.Equal("SB202609121200001", result.OrderCode);
        Assert.Equal("14088921", result.GatewayTransactionNo);
        Assert.Equal(200000m, result.Amount);
    }

    [Fact]
    public void VnPay_ProcessIpn_TamperedAmount_ShouldFailSignatureVerification()
    {
        // Arrange
        var service = new VnPayGatewayService(_config, _vnPayLoggerMock.Object);
        var hashSecret = "MYSECRETKEYVNPAY1234567890ABCDEF";

        var queryParams = new SortedDictionary<string, string>(StringComparer.Ordinal)
        {
            ["vnp_Amount"] = "20000000",
            ["vnp_ResponseCode"] = "00",
            ["vnp_TmnCode"] = "SBTEST01",
            ["vnp_TransactionNo"] = "14088921",
            ["vnp_TxnRef"] = "SB202609121200001"
        };

        var rawData = string.Join("&", queryParams.Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value)}"));
        var secureHash = VnPayGatewayService.ComputeHmacSha512(hashSecret, rawData);

        // Attacker tampers with amount after hash was generated
        var requestQuery = new Dictionary<string, string>(queryParams)
        {
            ["vnp_Amount"] = "50000000", // Tampered from 200k to 500k
            ["vnp_SecureHash"] = secureHash
        };

        // Act
        var result = service.ProcessIpn(requestQuery);

        // Assert
        Assert.False(result.IsValidSignature);
    }

    [Theory]
    [InlineData("MBVCB.12345678.SB20260912120000188.CT tu 0987123456", "SB20260912120000188")]
    [InlineData("Nap tien vi SkillBridge SB20260912120000188", "SB20260912120000188")]
    [InlineData("sb20260912120000188 chuyen khoan", "SB20260912120000188")]
    [InlineData("GD 99999 noi dung SB20260912120000188 tai VCB", "SB20260912120000188")]
    public void SePay_ExtractOrderCode_ShouldParseVariousBankNarratives(string narrative, string expectedCode)
    {
        // Arrange
        var service = new SePayGatewayService(_config, _sePayLoggerMock.Object);

        // Act
        var extracted = service.ExtractOrderCode(narrative);

        // Assert
        Assert.Equal(expectedCode, extracted);
    }

    [Fact]
    public void SePay_ProcessWebhook_InvalidApiKey_ShouldReject()
    {
        // Arrange
        var service = new SePayGatewayService(_config, _sePayLoggerMock.Object);
        var authHeader = "Apikey WRONG_KEY";
        var payload = "{\"id\":12345,\"transferAmount\":100000,\"content\":\"SB20260912120000188\"}";

        // Act
        var result = service.ProcessWebhook(authHeader, payload);

        // Assert
        Assert.False(result.IsValidApiKey);
    }

    [Fact]
    public void SePay_ProcessWebhook_ValidApiKeyAndContent_ShouldSucceed()
    {
        // Arrange
        var service = new SePayGatewayService(_config, _sePayLoggerMock.Object);
        var authHeader = "Apikey SEPAY_TEST_API_KEY_123456789";
        var payload = "{\"id\":998877,\"gateway\":\"MBBank\",\"transferAmount\":300000,\"content\":\"Chuyen tien SB20260912120000188 tu Nguyen Van A\"}";

        // Act
        var result = service.ProcessWebhook(authHeader, payload);

        // Assert
        Assert.True(result.IsValidApiKey);
        Assert.True(result.IsSuccess);
        Assert.Equal("SB20260912120000188", result.OrderCode);
        Assert.Equal("998877", result.GatewayTransactionId);
        Assert.Equal(300000m, result.Amount);
    }
}
