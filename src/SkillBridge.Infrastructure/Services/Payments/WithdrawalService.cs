using System;
using System.Collections.Generic;
using System.Linq;
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

public class WithdrawalService : IWithdrawalService
{
    private readonly SkillBridgeDbContext _dbContext;
    private readonly ILogger<WithdrawalService> _logger;
    private readonly string _encryptionKey;

    public WithdrawalService(
        SkillBridgeDbContext dbContext,
        IConfiguration config,
        ILogger<WithdrawalService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
        _encryptionKey = config["Encryption:Key"] ?? string.Empty;
    }

    public async Task<WithdrawalResponseDto> RequestWithdrawalAsync(
        int userId,
        CreateWithdrawalDto dto,
        string? ipAddress = null,
        CancellationToken ct = default)
    {
        if (dto == null)
        {
            throw new BusinessException("Dữ liệu yêu cầu rút tiền không hợp lệ.");
        }

        const decimal minWithdrawAmount = 50000m;
        if (dto.Amount < minWithdrawAmount)
        {
            throw new BusinessException($"Số tiền rút tối thiểu là {minWithdrawAmount:N0}đ.");
        }

        // BẢO MẬT: Kiểm tra tài khoản ngân hàng đã được xác thực
        var bankAccount = await _dbContext.BankAccounts
            .FirstOrDefaultAsync(b => b.UserId == userId && b.IsVerified, ct);

        if (bankAccount == null)
        {
            var walletCheck = await _dbContext.Wallets.AsNoTracking().FirstOrDefaultAsync(w => w.UserId == userId, ct);
            if (walletCheck == null || !walletCheck.IsBankVerified)
            {
                throw new BusinessException("Bạn chưa liên kết tài khoản ngân hàng hoặc tài khoản chưa được Quản trị viên phê duyệt xác thực. Vui lòng gửi hồ sơ xác thực tại trang Ví trước khi rút tiền.");
            }

            // Đồng bộ bản ghi BankAccount từ Wallet đã verified
            bankAccount = new BankAccount
            {
                UserId = userId,
                BankName = walletCheck.BankName ?? "Ngân hàng",
                AccountNumberEncrypted = EncryptionHelper.Encrypt(walletCheck.AccountNumber ?? "", _encryptionKey),
                AccountNumberMask = EncryptionHelper.MaskAccountNumber(walletCheck.AccountNumber ?? ""),
                AccountHolderName = walletCheck.AccountHolder ?? "CHỦ TÀI KHOẢN",
                IsVerified = true,
                IsDefault = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await _dbContext.BankAccounts.AddAsync(bankAccount, ct);
            await _dbContext.SaveChangesAsync(ct);
        }

        // Thực thi giao dịch trừ tiền ví an toàn với khóa hàng FOR UPDATE
        if (_dbContext.Database.IsRelational())
        {
            var strategy = _dbContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _dbContext.Database.BeginTransactionAsync(ct);
                var result = await RequestWithdrawalInternalAsync(userId, bankAccount, dto.Amount, ipAddress, ct);
                await transaction.CommitAsync(ct);
                return result;
            });
        }

        return await RequestWithdrawalInternalAsync(userId, bankAccount, dto.Amount, ipAddress, ct);
    }

    private async Task<WithdrawalResponseDto> RequestWithdrawalInternalAsync(
        int userId,
        BankAccount bankAccount,
        decimal amount,
        string? ipAddress,
        CancellationToken ct)
    {
        await GetWalletWithLockAsync(userId, ct);

        var wallet = await _dbContext.Wallets.FirstOrDefaultAsync(w => w.UserId == userId, ct);
        if (wallet == null || wallet.Balance < amount)
        {
            var currentBalance = wallet?.Balance ?? 0m;
            throw new BusinessException($"Số dư khả dụng ({currentBalance:N0}đ) không đủ để rút số tiền {amount:N0}đ.");
        }

        // Pha 1: Trừ số dư ví ngay lập tức để chống gian lận tiêu lặp (double-spending)
        wallet.Balance -= amount;

        var now = DateTime.UtcNow;
        var tx = new Transaction
        {
            UserId = userId,
            Type = "withdraw_hold",
            Label = $"Yêu cầu rút tiền về {bankAccount.BankName} · {bankAccount.AccountNumberMask} (Đang chờ Admin duyệt)",
            Amount = amount,
            Sign = -1,
            CreatedAt = now
        };
        await _dbContext.Transactions.AddAsync(tx, ct);
        await _dbContext.SaveChangesAsync(ct);

        var request = new WithdrawalRequest
        {
            UserId = userId,
            BankAccountId = bankAccount.Id,
            Amount = amount,
            Fee = 0,
            NetAmount = amount,
            Status = "pending",
            TransactionId = tx.Id,
            IpAddress = ipAddress,
            CreatedAt = now,
            UpdatedAt = now
        };
        await _dbContext.WithdrawalRequests.AddAsync(request, ct);
        await _dbContext.SaveChangesAsync(ct);

        _logger.LogInformation("Người dùng {UserId} đã tạo yêu cầu rút tiền #{RequestId} số tiền {Amount:N0}đ về {BankName} {Mask}",
            userId, request.Id, amount, bankAccount.BankName, bankAccount.AccountNumberMask);

        return MapToDto(request, bankAccount);
    }

    public async Task<WithdrawalResponseDto> ApproveWithdrawalAsync(
        int adminUserId,
        int withdrawalId,
        AdminApproveWithdrawalDto? dto = null,
        CancellationToken ct = default)
    {
        var request = await _dbContext.WithdrawalRequests
            .Include(r => r.BankAccount)
            .Include(r => r.Transaction)
            .FirstOrDefaultAsync(r => r.Id == withdrawalId, ct);

        if (request == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy yêu cầu rút tiền #{withdrawalId}.");
        }

        if (request.Status != "pending")
        {
            throw new BusinessException($"Chỉ có thể phê duyệt yêu cầu rút tiền đang ở trạng thái Chờ duyệt. Trạng thái hiện tại: {request.Status}.");
        }

        var adminMemberId = await EnsureAdminMemberIdAsync(adminUserId, ct);
        var now = DateTime.UtcNow;

        request.Status = "completed";
        request.ProcessedBy = adminMemberId;
        request.ProcessedAt = now;
        request.UpdatedAt = now;

        if (request.Transaction != null)
        {
            request.Transaction.Label = $"Rút tiền về {request.BankAccount.BankName} · {request.BankAccount.AccountNumberMask} (Thành công)";
        }

        await _dbContext.SaveChangesAsync(ct);

        _logger.LogInformation("Admin {AdminMemberId} đã phê duyệt yêu cầu rút tiền #{RequestId} ({Amount:N0}đ) cho User {UserId}.",
            adminMemberId, withdrawalId, request.Amount, request.UserId);

        return MapToDto(request, request.BankAccount);
    }

    public async Task<WithdrawalResponseDto> RejectWithdrawalAsync(
        int adminUserId,
        int withdrawalId,
        AdminRejectWithdrawalDto dto,
        CancellationToken ct = default)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.Reason))
        {
            throw new BusinessException("Vui lòng cung cấp lý do từ chối yêu cầu rút tiền.");
        }

        var request = await _dbContext.WithdrawalRequests
            .Include(r => r.BankAccount)
            .FirstOrDefaultAsync(r => r.Id == withdrawalId, ct);

        if (request == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy yêu cầu rút tiền #{withdrawalId}.");
        }

        if (request.Status != "pending")
        {
            throw new BusinessException($"Chỉ có thể từ chối yêu cầu rút tiền đang ở trạng thái Chờ duyệt. Trạng thái hiện tại: {request.Status}.");
        }

        if (_dbContext.Database.IsRelational())
        {
            var strategy = _dbContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _dbContext.Database.BeginTransactionAsync(ct);
                var result = await RejectWithdrawalInternalAsync(adminUserId, request, dto.Reason.Trim(), ct);
                await transaction.CommitAsync(ct);
                return result;
            });
        }

        return await RejectWithdrawalInternalAsync(adminUserId, request, dto.Reason.Trim(), ct);
    }

    private async Task<WithdrawalResponseDto> RejectWithdrawalInternalAsync(
        int adminUserId,
        WithdrawalRequest request,
        string reason,
        CancellationToken ct)
    {
        var adminMemberId = await EnsureAdminMemberIdAsync(adminUserId, ct);
        var now = DateTime.UtcNow;

        // Khóa hàng ví và hoàn tiền lại cho người dùng
        await GetWalletWithLockAsync(request.UserId, ct);
        var wallet = await _dbContext.Wallets.FirstOrDefaultAsync(w => w.UserId == request.UserId, ct);

        if (wallet != null)
        {
            wallet.Balance += request.Amount;
        }
        else
        {
            await _dbContext.Wallets.AddAsync(new Wallet
            {
                UserId = request.UserId,
                Balance = request.Amount
            }, ct);
        }

        var refundTx = new Transaction
        {
            UserId = request.UserId,
            Type = "withdraw_refund",
            Label = $"Hoàn tiền yêu cầu rút #{request.Id} bị từ chối: {reason}",
            Amount = request.Amount,
            Sign = 1,
            ReferenceId = request.Id,
            CreatedAt = now
        };
        await _dbContext.Transactions.AddAsync(refundTx, ct);

        request.Status = "rejected";
        request.RejectReason = reason;
        request.ProcessedBy = adminMemberId;
        request.ProcessedAt = now;
        request.UpdatedAt = now;

        await _dbContext.SaveChangesAsync(ct);

        _logger.LogInformation("Admin {AdminMemberId} đã từ chối yêu cầu rút #{RequestId} ({Amount:N0}đ), hoàn tiền về ví User {UserId}. Lý do: {Reason}",
            adminMemberId, request.Id, request.Amount, request.UserId, reason);

        return MapToDto(request, request.BankAccount);
    }

    public async Task<WithdrawalPagedResultDto<WithdrawalResponseDto>> GetMyWithdrawalsAsync(
        int userId,
        int page = 1,
        int pageSize = 20,
        CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 20;

        var query = _dbContext.WithdrawalRequests
            .AsNoTracking()
            .Include(r => r.BankAccount)
            .Where(r => r.UserId == userId);

        var totalCount = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new WithdrawalPagedResultDto<WithdrawalResponseDto>
        {
            Items = items.Select(r => MapToDto(r, r.BankAccount)).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<WithdrawalPagedResultDto<AdminWithdrawalItemDto>> GetAdminListAsync(
        string? status,
        int page = 1,
        int pageSize = 20,
        CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 20;

        var query = _dbContext.WithdrawalRequests
            .AsNoTracking()
            .Include(r => r.User)
            .Include(r => r.BankAccount)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            var cleanStatus = status.Trim().ToLowerInvariant();
            query = query.Where(r => r.Status == cleanStatus);
        }

        var totalCount = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var resultItems = items.Select(r =>
        {
            string? fullAccount = null;
            if (!string.IsNullOrWhiteSpace(r.BankAccount?.AccountNumberEncrypted) && !string.IsNullOrWhiteSpace(_encryptionKey))
            {
                try
                {
                    fullAccount = EncryptionHelper.Decrypt(r.BankAccount.AccountNumberEncrypted, _encryptionKey);
                }
                catch
                {
                    fullAccount = null;
                }
            }

            return new AdminWithdrawalItemDto
            {
                Id = r.Id,
                UserId = r.UserId,
                UserName = r.User?.FullName ?? "Unknown",
                UserEmail = r.User?.Email ?? "Unknown",
                BankName = r.BankAccount?.BankName ?? "Ngân hàng",
                AccountNumberMask = r.BankAccount?.AccountNumberMask ?? "******",
                AccountNumberFull = fullAccount,
                AccountHolderName = r.BankAccount?.AccountHolderName ?? "CHỦ TÀI KHOẢN",
                Amount = r.Amount,
                Fee = r.Fee,
                NetAmount = r.NetAmount,
                Status = r.Status,
                RejectReason = r.RejectReason,
                CreatedAt = r.CreatedAt,
                ProcessedAt = r.ProcessedAt
            };
        }).ToList();

        return new WithdrawalPagedResultDto<AdminWithdrawalItemDto>
        {
            Items = resultItems,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    private static WithdrawalResponseDto MapToDto(WithdrawalRequest r, BankAccount? b)
    {
        return new WithdrawalResponseDto
        {
            Id = r.Id,
            UserId = r.UserId,
            Amount = r.Amount,
            Fee = r.Fee,
            NetAmount = r.NetAmount,
            Status = r.Status,
            BankName = b?.BankName ?? "Ngân hàng",
            AccountNumberMask = b?.AccountNumberMask ?? "******",
            AccountHolderName = b?.AccountHolderName ?? "CHỦ TÀI KHOẢN",
            RejectReason = r.RejectReason,
            CreatedAt = r.CreatedAt,
            ProcessedAt = r.ProcessedAt
        };
    }

    private async Task<Wallet?> GetWalletWithLockAsync(int userId, CancellationToken ct)
    {
        if (_dbContext.Database.IsRelational())
        {
            await _dbContext.Database.ExecuteSqlRawAsync("SELECT id FROM wallets WHERE user_id = {0} FOR UPDATE", new object[] { userId }, ct);
        }
        return await _dbContext.Wallets.FirstOrDefaultAsync(w => w.UserId == userId, ct);
    }

    private async Task<int?> EnsureAdminMemberIdAsync(int adminUserId, CancellationToken ct)
    {
        var adminUser = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == adminUserId, ct);
        if (adminUser == null) return null;

        var adminMember = await _dbContext.AdminTeamMembers
            .FirstOrDefaultAsync(a => a.Email == adminUser.Email, ct);

        if (adminMember == null)
        {
            adminMember = new AdminTeamMember
            {
                Name = adminUser.FullName ?? "Admin Member",
                Email = adminUser.Email,
                RoleId = adminUser.RoleId,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            await _dbContext.AdminTeamMembers.AddAsync(adminMember, ct);
            await _dbContext.SaveChangesAsync(ct);
        }

        return adminMember.Id;
    }
}
