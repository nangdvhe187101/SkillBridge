using System;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
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
    private readonly IConfiguration? _configuration;
    private readonly HttpClient? _httpClient;

    public WalletService(
        SkillBridgeDbContext dbContext,
        ILogger<WalletService> logger,
        IConfiguration? configuration = null,
        HttpClient? httpClient = null)
    {
        _dbContext = dbContext;
        _logger = logger;
        _configuration = configuration;
        _httpClient = httpClient;
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

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var activeSub = await _dbContext.Subscriptions
            .AsNoTracking()
            .Where(s => s.UserId == userId 
                     && s.Status == PaymentConstants.ActiveSubscriptionStatus
                     && (s.RenewalDate == null || s.RenewalDate >= today))
            .OrderByDescending(s => s.UpdatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        string? planCode = null;
        string? planName = activeSub?.PlanName;
        DateTime? expiresAt = activeSub?.RenewalDate.HasValue == true
            ? activeSub.RenewalDate.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc)
            : null;
        decimal effectiveCommissionRate = PaymentConstants.DefaultCommissionRate; // 10%
        string? badge = null;

        if (activeSub != null)
        {
            var pName = activeSub.PlanName;
            if (pName.Contains(PaymentConstants.MasterPlanKeyword, StringComparison.OrdinalIgnoreCase))
            {
                planCode = PaymentConstants.PlanStuMaster;
                effectiveCommissionRate = PaymentConstants.MasterCommissionRate; // 3%
                badge = "master";
            }
            else if (pName.Contains(PaymentConstants.VipPlanKeyword, StringComparison.OrdinalIgnoreCase))
            {
                planCode = PaymentConstants.PlanEmpVip;
                effectiveCommissionRate = PaymentConstants.ProOrVipCommissionRate; // 5%
                badge = "vip";
            }
            else if (pName.Contains(PaymentConstants.ProPlanKeyword, StringComparison.OrdinalIgnoreCase))
            {
                planCode = PaymentConstants.PlanStuPro;
                effectiveCommissionRate = PaymentConstants.ProOrVipCommissionRate; // 5%
                badge = "pro";
            }
            else if (pName.Contains(PaymentConstants.GrowthPlanKeyword, StringComparison.OrdinalIgnoreCase))
            {
                planCode = PaymentConstants.PlanEmpGrowth;
                badge = "growth";
            }
            else if (pName.Contains(PaymentConstants.StarterPlanKeyword, StringComparison.OrdinalIgnoreCase))
            {
                if (pName.Contains("Student", StringComparison.OrdinalIgnoreCase))
                {
                    planCode = PaymentConstants.PlanStuStarter;
                    effectiveCommissionRate = PaymentConstants.StarterCommissionRate; // 8%
                    badge = "starter";
                }
                else
                {
                    planCode = PaymentConstants.PlanEmpStarter;
                    badge = "verified";
                }
            }
        }

        return new WalletResponseDto
        {
            UserId = userId,
            Balance = balance,
            EscrowLocked = escrowLocked,
            Transactions = txs,
            Receipts = receipts,
            HasVipSubscription = activeSub?.PlanName.Contains(PaymentConstants.VipPlanKeyword, StringComparison.OrdinalIgnoreCase) == true,
            HasProSubscription = activeSub?.PlanName.Contains(PaymentConstants.ProPlanKeyword, StringComparison.OrdinalIgnoreCase) == true,
            ActivePlanCode = planCode,
            ActivePlanName = planName,
            SubscriptionExpiresAt = expiresAt,
            EffectiveCommissionRate = effectiveCommissionRate,
            Badge = badge,
            BankBin = wallet?.BankBin,
            BankName = wallet?.BankName,
            AccountNumber = wallet?.AccountNumber,
            AccountHolder = wallet?.AccountHolder,
            BankBranch = wallet?.BankBranch,
            IsBankVerified = wallet?.IsBankVerified ?? false,
            BankLinkedAt = wallet?.BankLinkedAt
        };
    }

    public async Task<WalletResponseDto> UpdateBankAccountAsync(int userId, UpdateBankAccountRequest request, CancellationToken cancellationToken = default)
    {
        if (request == null)
        {
            throw new BusinessException("Thông tin tài khoản ngân hàng không hợp lệ.");
        }

        if (string.IsNullOrWhiteSpace(request.BankName) || string.IsNullOrWhiteSpace(request.AccountNumber))
        {
            throw new BusinessException("Vui lòng nhập đầy đủ tên ngân hàng và số tài khoản.");
        }

        if (string.IsNullOrWhiteSpace(request.AccountHolder))
        {
            throw new BusinessException("Vui lòng cung cấp tên chủ tài khoản ngân hàng.");
        }

        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null)
        {
            throw new BusinessException("Không tìm thấy thông tin người dùng trong hệ thống.");
        }

        var wallet = await _dbContext.Wallets.FirstOrDefaultAsync(w => w.UserId == userId, cancellationToken);
        if (wallet != null && wallet.IsBankVerified)
        {
            var cleanNewAcc = request.AccountNumber?.Trim();
            if (!string.Equals(wallet.AccountNumber, cleanNewAcc, StringComparison.OrdinalIgnoreCase))
            {
                throw new BusinessException("Không thể sửa trực tiếp số tài khoản đã được xác thực. Vui lòng tạo yêu cầu xác thực ngân hàng mới.");
            }
        }

        var cleanProfileName = user.FullName != null ? VietnameseConverter.RemoveVietnameseTones(user.FullName) : string.Empty;
        var cleanInputHolder = !string.IsNullOrWhiteSpace(request.AccountHolder)
            ? VietnameseConverter.RemoveVietnameseTones(request.AccountHolder)
            : cleanProfileName;

        if (!string.IsNullOrEmpty(cleanProfileName) && !string.Equals(cleanProfileName, cleanInputHolder, StringComparison.OrdinalIgnoreCase))
        {
            throw new BusinessException("Tên chủ tài khoản không khớp với tên hồ sơ của bạn.");
        }

        if (wallet == null)
        {
            wallet = new Wallet
            {
                UserId = userId,
                Balance = 0
            };
            await _dbContext.Wallets.AddAsync(wallet, cancellationToken);
        }

        wallet.BankBin = request.BankBin?.Trim();
        wallet.BankName = request.BankName?.Trim();
        wallet.AccountNumber = request.AccountNumber?.Trim();
        wallet.AccountHolder = !string.IsNullOrWhiteSpace(request.AccountHolder)
            ? request.AccountHolder.Trim().ToUpper()
            : (user.FullName != null ? VietnameseConverter.RemoveVietnameseTones(user.FullName).ToUpper() : "CHỦ TÀI KHOẢN");
        wallet.BankBranch = request.Branch?.Trim();
        // Không tự động xác thực ngân hàng: phải chờ Admin duyệt qua BankVerificationService
        wallet.IsBankVerified = false;
        wallet.BankLinkedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Người dùng {UserId} đã cập nhật thông tin tài khoản ngân hàng {BankName} - {AccountMask} (Chờ xác thực).", 
            userId, wallet.BankName, wallet.AccountNumber?.Length > 4 ? "****" + wallet.AccountNumber[^4..] : wallet.AccountNumber);

        return await GetMyWalletAsync(userId, cancellationToken);
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
}
