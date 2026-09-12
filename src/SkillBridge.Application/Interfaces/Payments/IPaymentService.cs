using System.Threading;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Payments;

namespace SkillBridge.Application.Interfaces.Payments;

public interface IPaymentService
{
    Task<CreatePaymentOrderResponse> CreatePaymentOrderAsync(int userId, CreatePaymentOrderRequest request, string clientIp, CancellationToken ct = default);
    Task<PaymentOrderStatusDto> GetOrderStatusAsync(int userId, string orderCode, CancellationToken ct = default);
    Task<PaymentOrderStatusDto> GetOrderStatusPublicAsync(string orderCode, CancellationToken ct = default);
    Task<CreatePaymentOrderResponse?> GetActivePendingOrderAsync(int userId, string clientIp, CancellationToken ct = default);
    Task<bool> CancelPendingOrderAsync(int userId, string orderCode, CancellationToken ct = default);
    Task<ConfirmPaymentResult> ConfirmPaymentAsync(string orderCode, string gatewayTxnId, decimal amount, string provider, string rawPayload, CancellationToken ct = default);
    Task LogWebhookAsync(string provider, string httpMethod, string requestUrl, string rawPayload, string? ipAddress, bool isValidSignature, string processedStatus, string? errorMessage, CancellationToken ct = default);
}
