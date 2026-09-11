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

        var employerWallet = await _dbContext.Wallets
            .FirstOrDefaultAsync(w => w.UserId == employerId, cancellationToken);

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

        var escrowReleaseTx = new Transaction
        {
            UserId = studentId,
            Type = "escrow_release",
            Label = $"Nhận thù lao giải ngân công việc #{jobId} · {jobTitle}",
            Amount = amount,
            Sign = 1,
            ReferenceId = jobId,
            CreatedAt = DateTime.UtcNow
        };
        await _dbContext.Transactions.AddAsync(escrowReleaseTx, cancellationToken);

        var studentWallet = await _dbContext.Wallets
            .FirstOrDefaultAsync(w => w.UserId == studentId, cancellationToken);

        if (studentWallet != null)
        {
            studentWallet.Balance += amount;
        }
        else
        {
            await _dbContext.Wallets.AddAsync(new Wallet
            {
                UserId = studentId,
                Balance = amount
            }, cancellationToken);
        }

        var receipt = new Receipt
        {
            JobId = jobId,
            StudentId = studentId,
            EmployerId = employerId,
            Budget = amount,
            Commission = 0,
            Total = amount,
            CreatedAt = DateTime.UtcNow
        };
        await _dbContext.Receipts.AddAsync(receipt, cancellationToken);

        _logger.LogInformation("Đã giải ngân thù lao {Amount:N0}đ cho sinh viên {StudentId} từ Job #{JobId}.", amount, studentId, jobId);
    }

    public async Task RefundEscrowAsync(int employerId, int jobId, string jobTitle, decimal amount, string reason, CancellationToken cancellationToken = default)
    {
        if (amount <= 0) return;

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

        var employerWallet = await _dbContext.Wallets
            .FirstOrDefaultAsync(w => w.UserId == employerId, cancellationToken);

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
}
