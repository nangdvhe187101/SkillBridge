using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SkillBridge.API.Common;
using SkillBridge.Application.DTOs.Payments;
using SkillBridge.Application.Interfaces.Payments;

namespace SkillBridge.API.Controllers.payments;

[ApiController]
[Route("api/payments")]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _paymentService;
    private readonly IVnPayGatewayService _vnPayGatewayService;
    private readonly ISePayGatewayService _sePayGatewayService;
    private readonly IConfiguration _config;
    private readonly ILogger<PaymentsController> _logger;

    public PaymentsController(
        IPaymentService paymentService,
        IVnPayGatewayService vnPayGatewayService,
        ISePayGatewayService sePayGatewayService,
        IConfiguration config,
        ILogger<PaymentsController> logger)
    {
        _paymentService = paymentService;
        _vnPayGatewayService = vnPayGatewayService;
        _sePayGatewayService = sePayGatewayService;
        _config = config;
        _logger = logger;
    }

    [Authorize]
    [HttpPost("create-order")]
    [EnableRateLimiting("ResourceCreationPolicy")]
    public async Task<IActionResult> CreateOrder([FromBody] CreatePaymentOrderRequest request, CancellationToken ct)
    {
        var userId = User.GetRequiredUserId();
        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        var response = await _paymentService.CreatePaymentOrderAsync(userId, request, clientIp, ct);
        return Ok(response);
    }

    [Authorize]
    [HttpGet("orders/pending")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetActivePendingOrder(CancellationToken ct)
    {
        var userId = User.GetRequiredUserId();
        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
        var pendingOrder = await _paymentService.GetActivePendingOrderAsync(userId, clientIp, ct);
        return Ok(pendingOrder);
    }

    [Authorize]
    [HttpPost("orders/{orderCode}/cancel")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> CancelPendingOrder([FromRoute] string orderCode, CancellationToken ct)
    {
        var userId = User.GetRequiredUserId();
        var success = await _paymentService.CancelPendingOrderAsync(userId, orderCode, ct);
        if (!success)
        {
            return NotFound(new { message = "Không tìm thấy đơn hàng hoặc đơn hàng không ở trạng thái chờ thanh toán." });
        }
        return Ok(new { success = true, message = "Đã hủy đơn nạp tiền thành công." });
    }

    [Authorize]
    [HttpGet("orders/{orderCode}/status")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetOrderStatus([FromRoute] string orderCode, CancellationToken ct)
    {
        var userId = User.GetRequiredUserId();
        var status = await _paymentService.GetOrderStatusAsync(userId, orderCode, ct);
        return Ok(status);
    }

    [HttpGet("vnpay-ipn")]
    [AllowAnonymous]
    public async Task<IActionResult> VnPayIpn(CancellationToken ct)
    {
        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString();
        var rawQuery = Request.QueryString.Value ?? string.Empty;
        var fullUrl = $"{Request.Path}{Request.QueryString}";

        _logger.LogInformation("Nhận VNPay IPN từ IP: {Ip}, Query: {Query}", clientIp, rawQuery);

        var queryDict = System.Linq.Enumerable.ToDictionary(Request.Query, k => k.Key, v => v.Value.ToString());
        var ipnResult = _vnPayGatewayService.ProcessIpn(queryDict);

        if (!ipnResult.IsValidSignature)
        {
            await _paymentService.LogWebhookAsync("VNPAY", "GET", fullUrl, rawQuery, clientIp, false, "invalid_signature", ipnResult.Message, ct);
            return Content("{\"RspCode\":\"97\",\"Message\":\"Invalid Checksum\"}", "application/json");
        }

        if (!ipnResult.IsSuccess)
        {
            await _paymentService.LogWebhookAsync("VNPAY", "GET", fullUrl, rawQuery, clientIp, true, "failed", ipnResult.Message, ct);
            // Theo tài liệu VNPay, khi thanh toán thất bại vẫn trả 00 để gateway ngừng retry
            return Content("{\"RspCode\":\"00\",\"Message\":\"Confirm Success\"}", "application/json");
        }

        var confirmResult = await _paymentService.ConfirmPaymentAsync(
            ipnResult.OrderCode!,
            ipnResult.GatewayTransactionNo ?? string.Empty,
            ipnResult.Amount,
            "VNPAY",
            rawQuery,
            ct);

        if (confirmResult.IsAlreadyProcessed)
        {
            await _paymentService.LogWebhookAsync("VNPAY", "GET", fullUrl, rawQuery, clientIp, true, "already_processed", confirmResult.Message, ct);
            return Content("{\"RspCode\":\"02\",\"Message\":\"Order already confirmed\"}", "application/json");
        }

        if (confirmResult.IsNotFound)
        {
            await _paymentService.LogWebhookAsync("VNPAY", "GET", fullUrl, rawQuery, clientIp, true, "not_found", confirmResult.Message, ct);
            return Content("{\"RspCode\":\"01\",\"Message\":\"Order not found\"}", "application/json");
        }

        if (confirmResult.IsAmountMismatch)
        {
            await _paymentService.LogWebhookAsync("VNPAY", "GET", fullUrl, rawQuery, clientIp, true, "amount_mismatch", confirmResult.Message, ct);
            return Content("{\"RspCode\":\"04\",\"Message\":\"Invalid amount\"}", "application/json");
        }

        if (confirmResult.Success)
        {
            await _paymentService.LogWebhookAsync("VNPAY", "GET", fullUrl, rawQuery, clientIp, true, "success", null, ct);
            return Content("{\"RspCode\":\"00\",\"Message\":\"Confirm Success\"}", "application/json");
        }

        await _paymentService.LogWebhookAsync("VNPAY", "GET", fullUrl, rawQuery, clientIp, true, "error", confirmResult.Message, ct);
        return Content("{\"RspCode\":\"99\",\"Message\":\"Unspecified error\"}", "application/json");
    }

    [HttpGet("vnpay-return")]
    [AllowAnonymous]
    public IActionResult VnPayReturn()
    {
        var orderCode = Request.Query["vnp_TxnRef"].ToString();
        var frontendUrl = _config["Frontend:BaseUrl"] ?? "http://localhost:5173";

        // Chuyển hướng người dùng về trang kết quả thanh toán trên Frontend.
        // Tuyệt đối không đọc responseCode trên URL này để cộng tiền!
        var redirectUrl = $"{frontendUrl.TrimEnd('/')}/payment/result?orderCode={Uri.EscapeDataString(orderCode)}";
        return Redirect(redirectUrl);
    }

    [HttpPost("sepay-webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> SePayWebhook(CancellationToken ct)
    {
        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString();
        var fullUrl = Request.Path.ToString();

        using var reader = new StreamReader(Request.Body, Encoding.UTF8);
        var rawBody = await reader.ReadToEndAsync(ct);
        var authHeader = Request.Headers.Authorization.ToString();

        _logger.LogInformation("Nhận SePay Webhook từ IP: {Ip}", clientIp);

        var parseResult = _sePayGatewayService.ProcessWebhook(authHeader, rawBody);

        if (!parseResult.IsValidApiKey)
        {
            await _paymentService.LogWebhookAsync("SEPAY", "POST", fullUrl, rawBody, clientIp, false, "invalid_signature", parseResult.Message, ct);
            return Unauthorized(new { error = parseResult.Message });
        }

        if (!parseResult.IsSuccess || string.IsNullOrWhiteSpace(parseResult.OrderCode))
        {
            await _paymentService.LogWebhookAsync("SEPAY", "POST", fullUrl, rawBody, clientIp, true, "unmatched", parseResult.Message, ct);
            // Trả 200 để SePay không retry dồn dập, lưu lại để đối soát thủ công
            return Ok(new { success = false, message = parseResult.Message });
        }

        var confirmResult = await _paymentService.ConfirmPaymentAsync(
            parseResult.OrderCode,
            parseResult.GatewayTransactionId ?? string.Empty,
            parseResult.Amount,
            "SEPAY",
            rawBody,
            ct);

        if (confirmResult.IsAlreadyProcessed)
        {
            await _paymentService.LogWebhookAsync("SEPAY", "POST", fullUrl, rawBody, clientIp, true, "already_processed", confirmResult.Message, ct);
            return Ok(new { success = true, message = "Already processed" });
        }

        if (confirmResult.IsNotFound)
        {
            await _paymentService.LogWebhookAsync("SEPAY", "POST", fullUrl, rawBody, clientIp, true, "not_found", confirmResult.Message, ct);
            return Ok(new { success = false, message = "Order not found" });
        }

        if (confirmResult.IsAmountMismatch)
        {
            await _paymentService.LogWebhookAsync("SEPAY", "POST", fullUrl, rawBody, clientIp, true, "amount_mismatch", confirmResult.Message, ct);
            return Ok(new { success = false, message = "Amount mismatch" });
        }

        if (confirmResult.Success)
        {
            await _paymentService.LogWebhookAsync("SEPAY", "POST", fullUrl, rawBody, clientIp, true, "success", null, ct);
            return Ok(new { success = true, message = "Thanh toán thành công" });
        }

        await _paymentService.LogWebhookAsync("SEPAY", "POST", fullUrl, rawBody, clientIp, true, "error", confirmResult.Message, ct);
        return Ok(new { success = false, message = confirmResult.Message });
    }
}
