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

        return new WalletResponseDto
        {
            UserId = userId,
            Balance = balance,
            Transactions = txs
        };
    }

    public async Task<WalletResponseDto> TopupAsync(int userId, TopupRequest request, CancellationToken cancellationToken = default)
    {
        if (request.Amount < 10000 || request.Amount > 100000000 || request.Amount % 1 != 0)
        {
            throw new BusinessException("Số tiền nạp không hợp lệ. Số tiền phải là số nguyên dương từ 10.000đ đến 100.000.000đ.");
        }

        var wallet = await _dbContext.Wallets
            .FirstOrDefaultAsync(w => w.UserId == userId, cancellationToken);

        if (wallet == null)
        {
            wallet = new Wallet
            {
                UserId = userId,
                Balance = request.Amount
            };
            await _dbContext.Wallets.AddAsync(wallet, cancellationToken);
        }
        else
        {
            wallet.Balance += request.Amount;
        }

        var methodLabel = string.IsNullOrWhiteSpace(request.PaymentMethod) ? "Chuyển khoản QR" : request.PaymentMethod.Trim();
        var tx = new Transaction
        {
            UserId = userId,
            Type = "topup",
            Label = $"Nạp tiền vào ví qua {methodLabel}",
            Amount = request.Amount,
            Sign = 1,
            CreatedAt = DateTime.UtcNow
        };
        await _dbContext.Transactions.AddAsync(tx, cancellationToken);

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Người dùng {UserId} đã nạp thành công {Amount:N0}đ vào ví qua {Method}.", userId, request.Amount, methodLabel);

        return await GetMyWalletAsync(userId, cancellationToken);
    }
}
