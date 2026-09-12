using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SkillBridge.Infrastructure.Data;

namespace SkillBridge.Infrastructure.Services.Payments;

public class PaymentReconciliationJob : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PaymentReconciliationJob> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(15);

    public PaymentReconciliationJob(IServiceScopeFactory scopeFactory, ILogger<PaymentReconciliationJob> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("PaymentReconciliationJob đã khởi động.");

        using var timer = new PeriodicTimer(_checkInterval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ReconcileExpiredOrdersAsync(stoppingToken);
                await timer.WaitForNextTickAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi xảy ra trong quá trình đối soát đơn thanh toán định kỳ.");
                try
                {
                    await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }
        }

        _logger.LogInformation("PaymentReconciliationJob đang dừng lại.");
    }

    private async Task ReconcileExpiredOrdersAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SkillBridgeDbContext>();

        var now = DateTime.UtcNow;

        // Cập nhật các đơn quá hạn ExpiresAt mà vẫn đang pending -> expired
        var expiredCount = await db.PaymentOrders
            .Where(o => o.Status == "pending" && o.ExpiresAt.HasValue && o.ExpiresAt.Value < now)
            .ExecuteUpdateAsync(s => s.SetProperty(o => o.Status, "expired"), ct);

        if (expiredCount > 0)
        {
            _logger.LogInformation("PaymentReconciliationJob: Đã đánh dấu {Count} đơn thanh toán quá hạn thành 'expired'.", expiredCount);
        }
    }
}
