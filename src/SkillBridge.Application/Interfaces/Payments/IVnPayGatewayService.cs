using System.Collections.Generic;
using SkillBridge.Application.DTOs.Payments;

namespace SkillBridge.Application.Interfaces.Payments;

public class VnPayProcessResult
{
    public bool IsValidSignature { get; set; }
    public bool IsSuccess { get; set; }
    public string? OrderCode { get; set; }
    public string? GatewayTransactionNo { get; set; }
    public decimal Amount { get; set; }
    public string? ResponseCode { get; set; }
    public string? Message { get; set; }
}

public interface IVnPayGatewayService
{
    string ProviderCode { get; }
    string CreatePaymentUrl(string orderCode, decimal amount, string clientIp);
    VnPayProcessResult ProcessIpn(IDictionary<string, string> queryParams);
}
