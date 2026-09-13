using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;
using SkillBridge.Application.Interfaces.Payments;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Services.Payments;

public class EscrowPaymentService : IEscrowPaymentService
{
    private readonly SkillBridgeDbContext _dbContext;
    private readonly ILogger<EscrowPaymentService> _logger;

    public EscrowPaymentService(SkillBridgeDbContext dbContext, ILogger<EscrowPaymentService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task HoldEscrowAsync(int employerId, int jobId, string jobTitle, decimal amount, CancellationToken cancellationToken = default)
    {
        if (amount <= 0) return;

        // Khóa hàng ví employer để chống lost-update khi có giao dịch nạp tiền/ký quỹ đồng thời
        var employerWallet = await GetWalletWithLockAsync(employerId, cancellationToken);

        if (employerWallet == null || employerWallet.Balance < amount)
        {
            var currentBalance = employerWallet?.Balance ?? 0;
            throw new BusinessException(
                $"Số dư ví không đủ để ký quỹ công việc. Cần: {amount:N0}đ, Hiện có: {currentBalance:N0}đ. Vui lòng nạp thêm tiền vào ví trước khi thuê.");
        }

        employerWallet.Balance -= amount;

        var escrowHoldTx = new Transaction
        {
            UserId = employerId,
            Type = "escrow_hold",
            Label = $"Tạm giữ Ký quỹ Escrow — Job #{jobId} · {jobTitle}",
            Amount = amount,
            Sign = -1,
            ReferenceId = jobId,
            CreatedAt = DateTime.UtcNow
        };
        await _dbContext.Transactions.AddAsync(escrowHoldTx, cancellationToken);

        _logger.LogInformation("Đã giữ ký quỹ {Amount:N0}đ cho Job #{JobId} của Nhà tuyển dụng {EmployerId}.", amount, jobId, employerId);
    }

    public async Task ReleaseEscrowAsync(int studentId, int employerId, int jobId, string jobTitle, decimal amount, CancellationToken cancellationToken = default)
    {
        if (amount <= 0) return;

        // Khóa hàng Job để chống race condition giải ngân kép (double-release)
        await GetJobWithLockAsync(jobId, cancellationToken);

        // Idempotency Guard: Đảm bảo công việc này chưa từng được giải ngân trước đó
        var alreadyReleased = await _dbContext.Receipts.AnyAsync(r => r.JobId == jobId, cancellationToken)
            || await _dbContext.Transactions.AnyAsync(t => t.Type == "escrow_release" && t.ReferenceId == jobId, cancellationToken);
        if (alreadyReleased)
        {
            _logger.LogWarning("Phát hiện yêu cầu giải ngân trùng lặp cho Job #{JobId}, StudentId={StudentId}. Thao tác bị chặn.", jobId, studentId);
            throw new BusinessException($"Công việc #{jobId} đã được giải ngân thù lao trước đó.");
        }

        // Xác định tỷ lệ hoa hồng nền tảng (VIP Business: 5%, Tài khoản thông thường: 10%)
        decimal commissionRate = 0.10m;
        var hasVipSubscription = await _dbContext.Subscriptions
            .AnyAsync(s => s.UserId == employerId && s.Status == PaymentConstants.ActiveSubscriptionStatus && s.PlanName.Contains(PaymentConstants.VipPlanKeyword), cancellationToken);
        if (hasVipSubscription)
        {
            commissionRate = 0.05m;
        }

        var commissionAmount = Math.Round(amount * commissionRate);
        var studentPayout = amount - commissionAmount;

        // Khóa hàng ví sinh viên để chống lost-update
        var studentWallet = await GetWalletWithLockAsync(studentId, cancellationToken);

        if (studentWallet != null)
        {
            studentWallet.Balance += studentPayout;
        }
        else
        {
            await _dbContext.Wallets.AddAsync(new Wallet
            {
                UserId = studentId,
                Balance = studentPayout
            }, cancellationToken);
        }

        // Ghi nhận thù lao giải ngân cho sinh viên
        var escrowReleaseTx = new Transaction
        {
            UserId = studentId,
            Type = "escrow_release",
            Label = commissionAmount > 0
                ? $"Nhận thù lao giải ngân công việc #{jobId} · {jobTitle} (Phí sàn {commissionRate * 100:0.#}%)"
                : $"Nhận thù lao giải ngân công việc #{jobId} · {jobTitle}",
            Amount = studentPayout,
            Sign = 1,
            ReferenceId = jobId,
            CreatedAt = DateTime.UtcNow
        };
        await _dbContext.Transactions.AddAsync(escrowReleaseTx, cancellationToken);

        // Ghi nhận giao dịch phí hoa hồng nền tảng nếu có
        if (commissionAmount > 0)
        {
            var commissionTx = new Transaction
            {
                UserId = studentId,
                Type = "commission",
                Label = $"Phí nền tảng ({commissionRate * 100:0.#}%) · {jobTitle}",
                Amount = commissionAmount,
                Sign = -1,
                ReferenceId = jobId,
                CreatedAt = DateTime.UtcNow
            };
            await _dbContext.Transactions.AddAsync(commissionTx, cancellationToken);
        }

        // Giữ Total = amount (giá trị hợp đồng gộp/Budget) theo đúng chuẩn nghiệp vụ kế toán & hiển thị UI
        var receipt = new Receipt
        {
            JobId = jobId,
            StudentId = studentId,
            EmployerId = employerId,
            Budget = amount,
            Commission = commissionAmount,
            Total = amount,
            CreatedAt = DateTime.UtcNow
        };
        await _dbContext.Receipts.AddAsync(receipt, cancellationToken);

        _logger.LogInformation("Đã giải ngân thù lao {Payout:N0}đ (phí sàn {Commission:N0}đ từ tổng {Budget:N0}đ) cho sinh viên {StudentId} từ Job #{JobId}.",
            studentPayout, commissionAmount, amount, studentId, jobId);
    }

    public async Task RefundEscrowAsync(int employerId, int jobId, string jobTitle, decimal amount, string reason, CancellationToken cancellationToken = default)
    {
        if (amount <= 0) return;

        // Khóa hàng Job để chống race condition hoàn tiền kép (double-refund)
        await GetJobWithLockAsync(jobId, cancellationToken);

        // Idempotency Guard: Không hoàn tiền nếu công việc đã được giải ngân hoặc đã hoàn tiền
        var alreadyReleased = await _dbContext.Receipts.AnyAsync(r => r.JobId == jobId, cancellationToken);
        if (alreadyReleased)
        {
            _logger.LogWarning("Không thể hoàn tiền vì Job #{JobId} đã được giải ngân thành công trước đó.", jobId);
            throw new BusinessException($"Công việc #{jobId} đã được giải ngân thù lao, không thể hoàn tiền.");
        }

        var alreadyRefunded = await _dbContext.Transactions.AnyAsync(t => t.Type == "escrow_refund" && t.ReferenceId == jobId && t.UserId == employerId, cancellationToken);
        if (alreadyRefunded)
        {
            _logger.LogWarning("Phát hiện yêu cầu hoàn tiền trùng lặp cho Job #{JobId}, EmployerId={EmployerId}.", jobId, employerId);
            throw new BusinessException($"Công việc #{jobId} đã được hoàn tiền ký quỹ trước đó.");
        }

        var refundTx = new Transaction
        {
            UserId = employerId,
            Type = "escrow_refund",
            Label = $"Hoàn tiền ký quỹ Job #{jobId} · {jobTitle} ({reason})",
            Amount = amount,
            Sign = 1,
            ReferenceId = jobId,
            CreatedAt = DateTime.UtcNow
        };
        await _dbContext.Transactions.AddAsync(refundTx, cancellationToken);

        // Khóa hàng ví employer để chống lost-update
        var employerWallet = await GetWalletWithLockAsync(employerId, cancellationToken);

        if (employerWallet != null)
        {
            employerWallet.Balance += amount;
        }
        else
        {
            await _dbContext.Wallets.AddAsync(new Wallet
            {
                UserId = employerId,
                Balance = amount
            }, cancellationToken);
        }

        _logger.LogInformation("Đã hoàn tiền ký quỹ {Amount:N0}đ cho Nhà tuyển dụng {EmployerId} tại Job #{JobId}. Lý do: {Reason}",
            amount, employerId, jobId, reason);
    }

    private async Task<Wallet?> GetWalletWithLockAsync(int userId, CancellationToken ct)
    {
        if (_dbContext.Database.IsRelational())
        {
            return await _dbContext.Wallets
                .FromSqlRaw("SELECT * FROM wallets WHERE user_id = {0} FOR UPDATE", userId)
                .SingleOrDefaultAsync(ct);
        }
        return await _dbContext.Wallets.FirstOrDefaultAsync(w => w.UserId == userId, ct);
    }

    private async Task<Job?> GetJobWithLockAsync(int jobId, CancellationToken ct)
    {
        if (_dbContext.Database.IsRelational())
        {
            return await _dbContext.Jobs
                .FromSqlRaw("SELECT * FROM jobs WHERE id = {0} FOR UPDATE", jobId)
                .SingleOrDefaultAsync(ct);
        }
        return await _dbContext.Jobs.FirstOrDefaultAsync(j => j.Id == jobId, ct);
    }
}
