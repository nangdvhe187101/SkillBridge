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

public class WalletService : IWalletService
{
    private readonly SkillBridgeDbContext _dbContext;
    private readonly ILogger<WalletService> _logger;

    public WalletService(SkillBridgeDbContext dbContext, ILogger<WalletService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task<WalletResponseDto> GetMyWalletAsync(int userId, CancellationToken cancellationToken = default)
    {
        var wallet = await _dbContext.Wallets
            .AsNoTracking()
            .FirstOrDefaultAsync(w => w.UserId == userId, cancellationToken);

        var balance = wallet?.Balance ?? 0;

        // Tính tổng tiền ký quỹ Escrow đang bị khóa cho các công việc chưa hoàn thành của employer
        var escrowLocked = await _dbContext.Jobs
            .AsNoTracking()
            .Where(j => j.EmployerId == userId && (j.Status == "in_progress" || j.Status == "submitted" || j.Status == "revision_requested"))
            .SumAsync(j => (decimal?)(j.EscrowAmount ?? j.Budget), cancellationToken) ?? 0m;

        var txs = await _dbContext.Transactions
            .AsNoTracking()
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .Take(50)
            .Select(t => new WalletTransactionDto
            {
                Id = t.Id,
                Type = t.Type,
                Label = t.Label,
                Amount = t.Amount,
                Sign = t.Sign,
                ReferenceId = t.ReferenceId,
                CreatedAt = t.CreatedAt
            })
            .ToListAsync(cancellationToken);

        var receipts = await _dbContext.Receipts
            .AsNoTracking()
            .Include(r => r.Job)
            .Include(r => r.Employer)
            .Include(r => r.Student)
            .Where(r => r.EmployerId == userId || r.StudentId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .Take(50)
            .Select(r => new ReceiptDto
            {
                Id = r.Id,
                Code = $"SB-REC-{r.JobId}-{r.Id}",
                JobId = r.JobId,
                JobTitle = r.Job != null ? r.Job.Title : "Hợp đồng công việc",
                EmployerName = r.Employer != null ? r.Employer.FullName : "Nhà tuyển dụng",
                StudentName = r.Student != null ? r.Student.FullName : "Sinh viên",
                Budget = r.Budget,
                Commission = r.Commission,
                Total = r.Total,
                NetPayout = r.Budget - r.Commission,
                CreatedAt = r.CreatedAt
            })
            .ToListAsync(cancellationToken);

        var activeSubscriptions = await _dbContext.Subscriptions
            .AsNoTracking()
            .Where(s => s.UserId == userId && s.Status == "active")
            .Select(s => s.PlanName)
            .ToListAsync(cancellationToken);

        return new WalletResponseDto
        {
            UserId = userId,
            Balance = balance,
            EscrowLocked = escrowLocked,
            Transactions = txs,
            Receipts = receipts,
            HasVipSubscription = activeSubscriptions.Any(p => p.Contains("VIP")),
            HasProSubscription = activeSubscriptions.Any(p => p.Contains("Pro"))
        };
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
}
