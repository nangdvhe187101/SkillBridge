using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;
using SkillBridge.Application.Interfaces;
using SkillBridge.Application.Interfaces.Payments;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Services.Payments;

public class EscrowPaymentService : IEscrowPaymentService
{
    private readonly SkillBridgeDbContext _dbContext;
    private readonly IEmailService? _emailService;
    private readonly ILogger<EscrowPaymentService> _logger;

    public EscrowPaymentService(SkillBridgeDbContext dbContext, ILogger<EscrowPaymentService> logger, IEmailService? emailService = null)
    {
        _dbContext = dbContext;
        _logger = logger;
        _emailService = emailService;
    }

    public async Task HoldEscrowAsync(int employerId, int jobId, string jobTitle, decimal amount, CancellationToken cancellationToken = default)
    {
        if (amount <= 0) return;

        if (_dbContext.Database.IsRelational() && _dbContext.Database.CurrentTransaction == null)
        {
            throw new InvalidOperationException("Escrow operation must be executed within an active transaction.");
        }

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

        if (_dbContext.Database.IsRelational() && _dbContext.Database.CurrentTransaction == null)
        {
            throw new InvalidOperationException("Escrow operation must be executed within an active transaction.");
        }

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

        // Xác định tỷ lệ hoa hồng nền tảng: min(studentRate, employerRate)
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // 1. Tỷ lệ phí theo NTD: VIP Business Suite được ưu đãi 5% cho SV, ngược lại mặc định 10%
        decimal employerRate = PaymentConstants.DefaultCommissionRate; // 10%
        var hasVipSubscription = await _dbContext.Subscriptions
            .AnyAsync(s => s.UserId == employerId 
                        && s.Status == PaymentConstants.ActiveSubscriptionStatus 
                        && s.PlanName.Contains(PaymentConstants.VipPlanKeyword)
                        && (s.RenewalDate == null || s.RenewalDate >= today), cancellationToken);
        if (hasVipSubscription)
        {
            employerRate = PaymentConstants.ProOrVipCommissionRate; // 5%
        }

        // 2. Tỷ lệ phí theo Sinh viên: Master Talent (3%), Freelance Pro (5%), Student Starter (8%), Thường (10%)
        decimal studentRate = PaymentConstants.DefaultCommissionRate; // 10%
        var activeStudentSubs = await _dbContext.Subscriptions
            .Where(s => s.UserId == studentId
                     && s.Status == PaymentConstants.ActiveSubscriptionStatus
                     && (s.RenewalDate == null || s.RenewalDate >= today))
            .Select(s => s.PlanName)
            .ToListAsync(cancellationToken);

        if (activeStudentSubs.Any(p => p.Contains(PaymentConstants.MasterPlanKeyword, StringComparison.OrdinalIgnoreCase)))
        {
            studentRate = PaymentConstants.MasterCommissionRate; // 3%
        }
        else if (activeStudentSubs.Any(p => p.Contains(PaymentConstants.ProPlanKeyword, StringComparison.OrdinalIgnoreCase)))
        {
            studentRate = PaymentConstants.ProOrVipCommissionRate; // 5%
        }
        else if (activeStudentSubs.Any(p => p.Contains(PaymentConstants.StarterPlanKeyword, StringComparison.OrdinalIgnoreCase)))
        {
            studentRate = PaymentConstants.StarterCommissionRate; // 8%
        }

        // 3. Tỷ lệ áp dụng là mức có lợi nhất cho sinh viên: min(studentRate, employerRate)
        decimal commissionRate = Math.Min(studentRate, employerRate);

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

        if (_emailService != null)
        {
            try
            {
                var student = await _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == studentId, cancellationToken);
                if (student != null && !string.IsNullOrWhiteSpace(student.Email))
                {
                    await _emailService.SendPayoutSuccessEmailAsync(
                        student.Email,
                        student.FullName,
                        jobTitle,
                        studentPayout,
                        commissionAmount);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Lỗi khi gửi email giải ngân thành công cho sinh viên {StudentId} Job #{JobId}.", studentId, jobId);
            }
        }
    }

    public async Task RefundEscrowAsync(int employerId, int jobId, string jobTitle, decimal amount, string reason, CancellationToken cancellationToken = default)
    {
        if (amount <= 0) return;

        if (_dbContext.Database.IsRelational() && _dbContext.Database.CurrentTransaction == null)
        {
            throw new InvalidOperationException("Escrow operation must be executed within an active transaction.");
        }

        // Khóa hàng Job để chống race condition hoàn tiền kép (double-refund)
        await GetJobWithLockAsync(jobId, cancellationToken);

        // Idempotency Guard 1: Không hoàn tiền nếu công việc đã được giải ngân thành công
        var alreadyReleased = await _dbContext.Receipts.AnyAsync(r => r.JobId == jobId, cancellationToken);
        if (alreadyReleased)
        {
            _logger.LogWarning("Không thể hoàn tiền vì Job #{JobId} đã được giải ngân thành công trước đó.", jobId);
            throw new BusinessException($"Công việc #{jobId} đã được giải ngân thù lao, không thể hoàn tiền.");
        }

        // Idempotency Guard 2: Kiểm soát số dư ký quỹ thực tế (Số hold trừ số refund)
        var totalHeld = await _dbContext.Transactions
            .Where(t => t.Type == "escrow_hold" && t.ReferenceId == jobId && t.UserId == employerId)
            .SumAsync(t => (decimal?)t.Amount, cancellationToken) ?? 0m;

        var totalRefunded = await _dbContext.Transactions
            .Where(t => t.Type == "escrow_refund" && t.ReferenceId == jobId && t.UserId == employerId)
            .SumAsync(t => (decimal?)t.Amount, cancellationToken) ?? 0m;

        if (totalHeld > 0)
        {
            var remainingEscrow = totalHeld - totalRefunded;
            if (remainingEscrow <= 0 || amount > remainingEscrow)
            {
                _logger.LogWarning("Phát hiện yêu cầu hoàn tiền vượt số dư ký quỹ Job #{JobId}, EmployerId={EmployerId}. Held: {Held}, Refunded: {Refunded}, Request: {Amount}",
                    jobId, employerId, totalHeld, totalRefunded, amount);
                throw new BusinessException($"Công việc #{jobId} đã được hoàn tiền ký quỹ trước đó (Số dư ký quỹ khả dụng còn lại: {Math.Max(0, remainingEscrow):N0}đ).");
            }
        }
        else
        {
            // Khi không có bản ghi escrow_hold (môi trường test hoặc legacy): chặn nếu đã có bản ghi refund trước đó
            if (totalRefunded > 0)
            {
                _logger.LogWarning("Phát hiện yêu cầu hoàn tiền trùng lặp cho Job #{JobId}, EmployerId={EmployerId}.", jobId, employerId);
                throw new BusinessException($"Công việc #{jobId} đã được hoàn tiền ký quỹ trước đó.");
            }
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
        if (_dbContext.Database.IsMySql())
        {
            await _dbContext.Database.ExecuteSqlRawAsync("SELECT id FROM wallets WHERE user_id = {0} FOR UPDATE", new object[] { userId }, ct);
            var tracked = _dbContext.ChangeTracker.Entries<Wallet>().FirstOrDefault(e => e.Entity.UserId == userId);
            if (tracked?.State == EntityState.Unchanged)
            {
                await tracked.ReloadAsync(ct);
            }
        }
        return await _dbContext.Wallets.FirstOrDefaultAsync(w => w.UserId == userId, ct);
    }

    private async Task<Job?> GetJobWithLockAsync(int jobId, CancellationToken ct)
    {
        if (_dbContext.Database.IsMySql())
        {
            await _dbContext.Database.ExecuteSqlRawAsync("SELECT id FROM jobs WHERE id = {0} FOR UPDATE", new object[] { jobId }, ct);
            var tracked = _dbContext.ChangeTracker.Entries<Job>().FirstOrDefault(e => e.Entity.Id == jobId);
            if (tracked?.State == EntityState.Unchanged)
            {
                await tracked.ReloadAsync(ct);
            }
        }
        return await _dbContext.Jobs.FirstOrDefaultAsync(j => j.Id == jobId, ct);
    }
}
