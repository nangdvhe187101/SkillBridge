using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Payments;
using SkillBridge.Application.Interfaces.Payments;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Services.Payments;

public class PaymentService : IPaymentService
{
    private readonly SkillBridgeDbContext _dbContext;
    private readonly IVnPayGatewayService _vnPayGatewayService;
    private readonly ISePayGatewayService _sePayGatewayService;
    private readonly IPaymentRealtimeNotifier _realtimeNotifier;
    private readonly ILogger<PaymentService> _logger;

    public PaymentService(
        SkillBridgeDbContext dbContext,
        IVnPayGatewayService vnPayGatewayService,
        ISePayGatewayService sePayGatewayService,
        IPaymentRealtimeNotifier realtimeNotifier,
        ILogger<PaymentService> logger)
    {
        _dbContext = dbContext;
        _vnPayGatewayService = vnPayGatewayService;
        _sePayGatewayService = sePayGatewayService;
        _realtimeNotifier = realtimeNotifier;
        _logger = logger;
    }

    public async Task<CreatePaymentOrderResponse> CreatePaymentOrderAsync(
        int userId,
        CreatePaymentOrderRequest request,
        string clientIp,
        CancellationToken ct = default)
    {
        if (request.Amount < 10000 || request.Amount > 100000000 || request.Amount % 1 != 0)
        {
            throw new BusinessException("Số tiền nạp không hợp lệ. Số tiền phải từ 10.000đ đến 100.000.000đ.");
        }

        var provider = request.Provider.Trim().ToUpperInvariant();
        if (provider != "VNPAY" && provider != "SEPAY")
        {
            throw new BusinessException("Cổng thanh toán không hỗ trợ. Vui lòng chọn VNPAY hoặc SEPAY.");
        }

        var now = DateTime.UtcNow;

        // Chống spam: Giới hạn tối đa 10 đơn tạo trong 5 phút
        var recentOrdersCount = await _dbContext.PaymentOrders
            .CountAsync(o => o.UserId == userId && o.CreatedAt >= now.AddMinutes(-5), ct);
        if (recentOrdersCount >= 10)
        {
            throw new BusinessException("Bạn đang tạo đơn thanh toán quá thường xuyên. Vui lòng chờ ít phút hoặc hoàn tất đơn đang chờ.");
        }

        // Tối ưu quản lý đơn pending: Kiểm tra đơn pending còn hạn của user
        var existingPendingOrder = await _dbContext.PaymentOrders
            .Where(o => o.UserId == userId && o.Status == "pending" && o.ExpiresAt.HasValue && o.ExpiresAt.Value > now.AddMinutes(2))
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (existingPendingOrder != null)
        {
            // Nếu cùng cổng và cùng số tiền: Tái sử dụng đơn pending cũ (tránh sinh thêm đơn rác)
            if (existingPendingOrder.Provider == provider && existingPendingOrder.Amount == request.Amount)
            {
                _logger.LogInformation("Tái sử dụng đơn pending {OrderCode} cho User {UserId}", existingPendingOrder.OrderCode, userId);
                var reusedResponse = new CreatePaymentOrderResponse
                {
                    OrderCode = existingPendingOrder.OrderCode,
                    Provider = existingPendingOrder.Provider,
                    Amount = existingPendingOrder.Amount,
                    ExpiresAt = existingPendingOrder.ExpiresAt ?? now.AddMinutes(15)
                };

                if (provider == "VNPAY")
                {
                    reusedResponse.PaymentUrl = _vnPayGatewayService.CreatePaymentUrl(existingPendingOrder.OrderCode, existingPendingOrder.Amount, clientIp);
                }
                else if (provider == "SEPAY")
                {
                    var bInfo = _sePayGatewayService.GetBankInfo();
                    reusedResponse.QrCodeUrl = _sePayGatewayService.GenerateVietQrUrl(existingPendingOrder.OrderCode, existingPendingOrder.Amount);
                    reusedResponse.AccountNumber = bInfo.AccountNumber;
                    reusedResponse.BankCode = bInfo.BankCode;
                    reusedResponse.BankName = bInfo.BankName;
                    reusedResponse.TransferContent = existingPendingOrder.OrderCode;
                }
                return reusedResponse;
            }

            // Nếu người dùng đổi số tiền: Hủy các đơn pending cũ của user
            await _dbContext.PaymentOrders
                .Where(o => o.UserId == userId && o.Status == "pending")
                .ExecuteUpdateAsync(s => s.SetProperty(o => o.Status, "cancelled"), ct);
        }

        // Generate unique internal order code: SB + YYYYMMDDHHmmss + UserId + 2 random digits
        var randomSuffix = Random.Shared.Next(10, 99);
        var orderCode = $"SB{DateTime.UtcNow:yyyyMMddHHmmss}{userId}{randomSuffix}";
        var expiresAt = DateTime.UtcNow.AddMinutes(15);

        var order = new PaymentOrder
        {
            UserId = userId,
            OrderCode = orderCode,
            Provider = provider,
            Amount = request.Amount,
            Status = "pending",
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = expiresAt
        };

        _dbContext.PaymentOrders.Add(order);
        await _dbContext.SaveChangesAsync(ct);

        var response = new CreatePaymentOrderResponse
        {
            OrderCode = orderCode,
            Provider = provider,
            Amount = request.Amount,
            ExpiresAt = expiresAt
        };

        if (provider == "VNPAY")
        {
            response.PaymentUrl = _vnPayGatewayService.CreatePaymentUrl(orderCode, request.Amount, clientIp);
        }
        else if (provider == "SEPAY")
        {
            var bankInfo = _sePayGatewayService.GetBankInfo();
            response.QrCodeUrl = _sePayGatewayService.GenerateVietQrUrl(orderCode, request.Amount);
            response.AccountNumber = bankInfo.AccountNumber;
            response.BankCode = bankInfo.BankCode;
            response.BankName = bankInfo.BankName;
            response.TransferContent = orderCode;
        }

        _logger.LogInformation("Tạo đơn nạp tiền {OrderCode} thành công cho User {UserId}, cổng {Provider}, số tiền {Amount:N0}đ",
            orderCode, userId, provider, request.Amount);

        return response;
    }

    public async Task<PaymentOrderStatusDto> GetOrderStatusAsync(int userId, string orderCode, CancellationToken ct = default)
    {
        var order = await _dbContext.PaymentOrders
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.OrderCode == orderCode && o.UserId == userId, ct);

        if (order == null)
        {
            throw new BusinessException("Không tìm thấy đơn nạp tiền.");
        }

        return new PaymentOrderStatusDto
        {
            OrderCode = order.OrderCode,
            Provider = order.Provider,
            Amount = order.Amount,
            Status = order.Status,
            PaidAt = order.PaidAt,
            ExpiresAt = order.ExpiresAt
        };
    }

    public async Task<CreatePaymentOrderResponse?> GetActivePendingOrderAsync(int userId, string clientIp, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var order = await _dbContext.PaymentOrders
            .AsNoTracking()
            .Where(o => o.UserId == userId && o.Status == "pending" && o.ExpiresAt.HasValue && o.ExpiresAt.Value > now)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (order == null) return null;

        var response = new CreatePaymentOrderResponse
        {
            OrderCode = order.OrderCode,
            Provider = order.Provider,
            Amount = order.Amount,
            ExpiresAt = order.ExpiresAt!.Value
        };

        if (order.Provider == "VNPAY")
        {
            response.PaymentUrl = _vnPayGatewayService.CreatePaymentUrl(order.OrderCode, order.Amount, clientIp);
        }
        else if (order.Provider == "SEPAY")
        {
            var bankInfo = _sePayGatewayService.GetBankInfo();
            response.QrCodeUrl = _sePayGatewayService.GenerateVietQrUrl(order.OrderCode, order.Amount);
            response.AccountNumber = bankInfo.AccountNumber;
            response.BankCode = bankInfo.BankCode;
            response.BankName = bankInfo.BankName;
            response.TransferContent = order.OrderCode;
        }

        return response;
    }

    public async Task<bool> CancelPendingOrderAsync(int userId, string orderCode, CancellationToken ct = default)
    {
        var order = await _dbContext.PaymentOrders
            .FirstOrDefaultAsync(o => o.UserId == userId && o.OrderCode == orderCode && o.Status == "pending", ct);

        if (order == null) return false;

        order.Status = "cancelled";
        await _dbContext.SaveChangesAsync(ct);
        _logger.LogInformation("User {UserId} đã chủ động hủy đơn pending {OrderCode}", userId, orderCode);
        return true;
    }

    public async Task<PaymentOrderStatusDto> GetOrderStatusPublicAsync(string orderCode, CancellationToken ct = default)
    {
        var order = await _dbContext.PaymentOrders
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.OrderCode == orderCode, ct);

        if (order == null)
        {
            throw new BusinessException("Không tìm thấy đơn nạp tiền.");
        }

        return new PaymentOrderStatusDto
        {
            OrderCode = order.OrderCode,
            Provider = order.Provider,
            Amount = order.Amount,
            Status = order.Status,
            PaidAt = order.PaidAt,
            ExpiresAt = order.ExpiresAt
        };
    }

    public async Task<ConfirmPaymentResult> ConfirmPaymentAsync(
        string orderCode,
        string gatewayTxnId,
        decimal amount,
        string provider,
        string rawPayload,
        CancellationToken ct = default)
    {
        var executionStrategy = _dbContext.Database.CreateExecutionStrategy();

        return await executionStrategy.ExecuteAsync(async () =>
        {
            await using var tx = await _dbContext.Database.BeginTransactionAsync(ct);

            // Row-level lock on PaymentOrder
            var order = await _dbContext.PaymentOrders
                .FromSqlRaw("SELECT * FROM payment_orders WHERE order_code = {0} FOR UPDATE", orderCode)
                .SingleOrDefaultAsync(ct);

            if (order == null)
            {
                _logger.LogWarning("Xác nhận thanh toán thất bại: Không tìm thấy đơn hàng {OrderCode}", orderCode);
                return ConfirmPaymentResult.NotFound($"Không tìm thấy đơn hàng {orderCode}");
            }

            // Idempotency: Nếu đơn đã được xác nhận thanh toán trước đó
            if (order.Status == "paid")
            {
                _logger.LogInformation("Đơn hàng {OrderCode} đã được xử lý trước đó. Bỏ qua xác nhận trùng (Idempotency).", orderCode);
                return ConfirmPaymentResult.AlreadyProcessed();
            }

            // Amount mismatch check: Nếu số tiền thực trả khác với số tiền đã tạo
            if (order.Amount != amount)
            {
                _logger.LogWarning("Số tiền thanh toán không khớp cho đơn {OrderCode}: dự kiến {Expected:N0}đ, thực nhận {Actual:N0}đ",
                    orderCode, order.Amount, amount);
                return ConfirmPaymentResult.AmountMismatch($"Số tiền không khớp (mong đợi {order.Amount}, nhận {amount})");
            }

            // Mark order as paid
            order.Status = "paid";
            order.GatewayTransactionId = gatewayTxnId;
            order.PaidAt = DateTime.UtcNow;
            order.RawWebhookPayload = rawPayload;

            // Row-level lock on Wallet
            var wallet = await _dbContext.Wallets
                .FromSqlRaw("SELECT * FROM wallets WHERE user_id = {0} FOR UPDATE", order.UserId)
                .SingleOrDefaultAsync(ct);

            if (wallet == null)
            {
                wallet = new Wallet
                {
                    UserId = order.UserId,
                    Balance = order.Amount
                };
                await _dbContext.Wallets.AddAsync(wallet, ct);
            }
            else
            {
                wallet.Balance += order.Amount;
            }

            // Add Ledger Transaction record
            var transaction = new Transaction
            {
                UserId = order.UserId,
                Type = "topup",
                Label = $"Nạp tiền qua {provider} (Đơn {orderCode})",
                Amount = order.Amount,
                Sign = 1,
                ReferenceId = order.Id,
                CreatedAt = DateTime.UtcNow
            };
            await _dbContext.Transactions.AddAsync(transaction, ct);

            // Save changes (Unique index on gateway_transaction_id will catch concurrent races if any)
            await _dbContext.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            _logger.LogInformation("Xác nhận nạp tiền thành công cho đơn {OrderCode}, User {UserId}, số tiền {Amount:N0}đ qua {Provider}",
                orderCode, order.UserId, order.Amount, provider);

            // Bắn realtime notification qua SignalR / Redis tới đúng channel của đơn hàng
            await _realtimeNotifier.NotifyPaymentSuccessAsync(orderCode, new PaymentOrderStatusDto
            {
                OrderCode = order.OrderCode,
                Provider = order.Provider,
                Status = order.Status,
                Amount = order.Amount,
                ExpiresAt = order.ExpiresAt,
                PaidAt = order.PaidAt
            }, ct);

            return ConfirmPaymentResult.Succeeded();
        });
    }

    public async Task LogWebhookAsync(
        string provider,
        string httpMethod,
        string requestUrl,
        string rawPayload,
        string? ipAddress,
        bool isValidSignature,
        string processedStatus,
        string? errorMessage,
        CancellationToken ct = default)
    {
        try
        {
            var log = new WebhookLog
            {
                Provider = provider,
                HttpMethod = httpMethod,
                RequestUrl = requestUrl,
                RawPayload = rawPayload,
                IpAddress = ipAddress,
                IsValidSignature = isValidSignature,
                ProcessedStatus = processedStatus,
                ErrorMessage = errorMessage,
                CreatedAt = DateTime.UtcNow
            };

            _dbContext.WebhookLogs.Add(log);
            await _dbContext.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lưu WebhookLog cho {Provider}", provider);
        }
    }
}
