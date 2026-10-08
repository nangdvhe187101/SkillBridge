using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text.Json;
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

public class WithdrawalService : IWithdrawalService
{
    public const decimal LargeWithdrawalThreshold = 5000000m;

    private class WithdrawalMakerInfo
    {
        public int MakerUserId { get; set; }
        public int? MakerMemberId { get; set; }
        public string MakerName { get; set; } = string.Empty;
        public DateTime MakerAt { get; set; }
        public string? Note { get; set; }
    }

    private readonly SkillBridgeDbContext _dbContext;
    private readonly ILogger<WithdrawalService> _logger;
    private readonly IEncryptionKeyProvider _keyProvider;

    public WithdrawalService(
        SkillBridgeDbContext dbContext,
        IEncryptionKeyProvider keyProvider,
        ILogger<WithdrawalService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
        _keyProvider = keyProvider;
    }

    private static string FitLabel(string s, int max = 255) => s.Length <= max ? s : s[..(max - 1)] + "…";

    private static string? CleanText(string? s, int max)
    {
        if (string.IsNullOrWhiteSpace(s)) return null;
        var t = new string(s.Where(c => !char.IsControl(c)).ToArray()).Trim();
        return t.Length > max ? t[..max] : t;
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

        // Lấy khóa mã hóa trước khi mở transaction
        var encryptionKey = _keyProvider.GetKey();

        if (_dbContext.Database.IsRelational())
        {
            var strategy = _dbContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _dbContext.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
                var result = await RequestWithdrawalInternalAsync(userId, dto.Amount, encryptionKey, ipAddress, ct);
                await transaction.CommitAsync(ct);
                return result;
            });
        }

        return await RequestWithdrawalInternalAsync(userId, dto.Amount, encryptionKey, ipAddress, ct);
    }

    private async Task<WithdrawalResponseDto> RequestWithdrawalInternalAsync(
        int userId,
        decimal amount,
        string encryptionKey,
        string? ipAddress,
        CancellationToken ct)
    {
        var wallet = await GetWalletWithLockAsync(userId, ct);
        if (wallet == null || !wallet.IsBankVerified || string.IsNullOrWhiteSpace(wallet.AccountNumber) || string.IsNullOrWhiteSpace(wallet.BankName))
        {
            throw new BusinessException("Bạn chưa liên kết tài khoản ngân hàng hoặc tài khoản chưa được Quản trị viên phê duyệt xác thực. Vui lòng gửi hồ sơ xác thực tại trang Ví trước khi rút tiền.");
        }

        // 1. Kiểm tra tạm giữ rút tiền do đổi thông tin định danh
        if (wallet.WithdrawHoldUntil.HasValue && wallet.WithdrawHoldUntil.Value > DateTime.UtcNow)
        {
            throw new BusinessException($"Tính năng rút tiền đang bị tạm khóa đến {wallet.WithdrawHoldUntil.Value:dd/MM/yyyy HH:mm} (UTC). Lý do: {wallet.WithdrawHoldReason ?? "Đang cập nhật hoặc thay đổi thông tin định danh"}.");
        }

        // 2. Bắt buộc sinh viên phải có hồ sơ sinh viên hợp lệ và tên chủ tài khoản ngân hàng khớp với thẻ sinh viên (REQ-SEC-01)
        var user = await _dbContext.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user?.Role?.Code == "student")
        {
            var studentProfile = await _dbContext.StudentProfiles
                .FirstOrDefaultAsync(sp => sp.UserId == userId && sp.ExpiresAt > DateTime.UtcNow, ct);
            if (studentProfile == null)
            {
                throw new BusinessException("Bạn cần hoàn tất xác minh thẻ sinh viên để thực hiện rút tiền.");
            }

            var cleanBankHolder = VietnameseConverter.RemoveVietnameseTones(wallet.AccountHolder);
            var cleanStudentName = VietnameseConverter.RemoveVietnameseTones(studentProfile.VerifiedFullName);

            if (!string.Equals(cleanBankHolder, cleanStudentName, StringComparison.OrdinalIgnoreCase))
            {
                throw new BusinessException($"Tên chủ tài khoản ngân hàng ({wallet.AccountHolder}) không khớp với tên trên thẻ sinh viên đã xác minh ({studentProfile.VerifiedFullName}). Vì lý do an toàn tài chính, bạn chỉ có thể rút tiền về tài khoản ngân hàng chính chủ.");
            }

            // 3. Giới hạn lần rút tiền đầu tiên của tài khoản sinh viên: tối đa 5.000.000 VNĐ
            var hasPastCompletedWithdrawal = await _dbContext.WithdrawalRequests
                .AnyAsync(w => w.UserId == userId && w.Status == "completed", ct);
            if (!hasPastCompletedWithdrawal && amount > 5000000m)
            {
                throw new BusinessException("Tài khoản sinh viên chỉ được rút tối đa 5.000.000 VNĐ cho lần rút đầu tiên. Hạn mức sẽ được mở rộng ở các lần rút tiếp theo.");
            }
        }

        if (wallet.Balance < amount)
        {
            throw new BusinessException($"Số dư khả dụng ({wallet.Balance:N0}đ) không đủ để rút số tiền {amount:N0}đ.");
        }

        // Đồng bộ BankAccount khớp ví hiện tại
        var userAccounts = await _dbContext.BankAccounts.Where(b => b.UserId == userId).ToListAsync(ct);
        var matchedAccount = BankAccountMatcher.Find(userAccounts, wallet.BankName, wallet.AccountNumber, encryptionKey);

        if (matchedAccount == null)
        {
            foreach (var acc in userAccounts)
            {
                acc.IsDefault = false;
                acc.IsVerified = false;
            }

            matchedAccount = new BankAccount
            {
                UserId = userId,
                BankName = wallet.BankName,
                AccountNumberEncrypted = EncryptionHelper.Encrypt(wallet.AccountNumber, encryptionKey),
                AccountNumberMask = EncryptionHelper.MaskAccountNumber(wallet.AccountNumber),
                AccountHolderName = wallet.AccountHolder ?? "CHỦ TÀI KHOẢN",
                IsVerified = true,
                IsDefault = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await _dbContext.BankAccounts.AddAsync(matchedAccount, ct);
            await _dbContext.SaveChangesAsync(ct);
        }
        else
        {
            foreach (var acc in userAccounts.Where(a => a.Id != matchedAccount.Id))
            {
                acc.IsDefault = false;
                acc.IsVerified = false;
            }
            matchedAccount.IsDefault = true;
            matchedAccount.IsVerified = true;
            matchedAccount.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync(ct);
        }

        // Trừ số dư ví ngay lập tức để chống double-spending
        wallet.Balance -= amount;

        var now = DateTime.UtcNow;
        var tx = new Transaction
        {
            UserId = userId,
            Type = "withdraw_hold",
            Label = FitLabel($"Yêu cầu rút tiền về {matchedAccount.BankName} · {matchedAccount.AccountNumberMask} (Đang chờ Admin duyệt)"),
            Amount = amount,
            Sign = -1,
            CreatedAt = now
        };
        await _dbContext.Transactions.AddAsync(tx, ct);
        await _dbContext.SaveChangesAsync(ct);

        var request = new WithdrawalRequest
        {
            UserId = userId,
            BankAccountId = matchedAccount.Id,
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
            userId, request.Id, amount, matchedAccount.BankName, matchedAccount.AccountNumberMask);

        return MapToDto(request, matchedAccount);
    }

    public async Task<WithdrawalResponseDto> ApproveWithdrawalAsync(
        int adminUserId,
        int withdrawalId,
        AdminApproveWithdrawalDto? dto = null,
        CancellationToken ct = default)
    {
        if (_dbContext.Database.IsRelational())
        {
            var strategy = _dbContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _dbContext.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
                var result = await ApproveWithdrawalInternalAsync(adminUserId, withdrawalId, dto, ct);
                await transaction.CommitAsync(ct);
                return result;
            });
        }

        return await ApproveWithdrawalInternalAsync(adminUserId, withdrawalId, dto, ct);
    }

    private async Task<WithdrawalResponseDto> ApproveWithdrawalInternalAsync(
        int adminUserId,
        int withdrawalId,
        AdminApproveWithdrawalDto? dto,
        CancellationToken ct)
    {
        if (_dbContext.Database.IsMySql())
        {
            await _dbContext.Database.ExecuteSqlRawAsync("SELECT id FROM withdrawal_requests WHERE id = {0} FOR UPDATE", new object[] { withdrawalId }, ct);
        }

        var request = await _dbContext.WithdrawalRequests
            .Include(r => r.BankAccount)
            .Include(r => r.Transaction)
            .FirstOrDefaultAsync(r => r.Id == withdrawalId, ct);

        if (request == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy yêu cầu rút tiền #{withdrawalId}.");
        }

        // [DT01-1] Chống tự phê duyệt (Self-Approval)
        if (request.UserId == adminUserId)
        {
            throw new BusinessException("[E-SEC-01] Cấm tự phê duyệt hoặc thao tác trên yêu cầu rút tiền của chính mình.");
        }

        var adminMemberId = await EnsureAdminMemberIdAsync(adminUserId, ct);
        var adminUser = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == adminUserId, ct);
        var adminName = adminUser?.FullName ?? "Admin";
        var now = DateTime.UtcNow;
        var cleanNote = CleanText(dto?.Note, 80);
        var refText = cleanNote != null ? $" - Mã UNC: {cleanNote}" : "";

        // Quy tắc Maker-Checker dựa trên ngưỡng LargeWithdrawalThreshold (5.000.000 VNĐ theo DT-01)
        var requiresMakerChecker = request.Amount > LargeWithdrawalThreshold;

        if (!requiresMakerChecker)
        {
            // DT01-2: Rút tiền thông thường (<= 5.000.000đ) - Duyệt ngay 1 cấp
            if (request.Status != "pending")
            {
                throw new BusinessException($"Chỉ có thể phê duyệt yêu cầu rút tiền đang ở trạng thái Chờ duyệt. Trạng thái hiện tại: {request.Status}.");
            }

            request.Status = "completed";
            request.ProcessedBy = adminMemberId;
            request.ProcessedAt = now;
            request.UpdatedAt = now;

            if (request.Transaction != null)
            {
                request.Transaction.Label = FitLabel($"Rút tiền về {request.BankAccount.BankName} · {request.BankAccount.AccountNumberMask} (Thành công{refText})");
            }

            await _dbContext.SaveChangesAsync(ct);

            _logger.LogInformation("Admin {AdminMemberId} đã phê duyệt yêu cầu rút tiền #{RequestId} ({Amount:N0}đ) cho User {UserId}.",
                adminMemberId, withdrawalId, request.Amount, request.UserId);

            var response = MapToDto(request, request.BankAccount);
            response.RequiresMakerChecker = false;
            response.AwaitingChecker = false;
            response.Message = "Phê duyệt rút tiền thành công.";
            return response;
        }

        // Trường hợp rút tiền lớn (> 5.000.000đ) - Áp dụng Maker-Checker 2 bước
        var settingKey = $"withdrawal_maker_{withdrawalId}";

        if (request.Status == "pending")
        {
            // DT01-3: Bước 1 - Maker duyệt/đề xuất cấp 1
            var makerInfo = new WithdrawalMakerInfo
            {
                MakerUserId = adminUserId,
                MakerMemberId = adminMemberId,
                MakerName = adminName,
                MakerAt = now,
                Note = cleanNote
            };

            var makerSetting = await _dbContext.SystemSettings.FirstOrDefaultAsync(s => s.Key == settingKey, ct);
            if (makerSetting != null)
            {
                makerSetting.Value = JsonSerializer.Serialize(makerInfo);
                makerSetting.UpdatedAt = now;
            }
            else
            {
                await _dbContext.SystemSettings.AddAsync(new SystemSetting
                {
                    Key = settingKey,
                    Value = JsonSerializer.Serialize(makerInfo),
                    Description = $"Maker metadata for withdrawal #{withdrawalId}",
                    UpdatedAt = now
                }, ct);
            }

            request.Status = "processing";
            request.ProcessedBy = adminMemberId;
            request.UpdatedAt = now;

            if (request.Transaction != null)
            {
                request.Transaction.Label = FitLabel($"Rút tiền về {request.BankAccount.BankName} · {request.BankAccount.AccountNumberMask} (Chờ duyệt cấp 2 - Maker: {adminName}{refText})");
            }

            await _dbContext.SaveChangesAsync(ct);

            _logger.LogInformation("Maker {AdminMemberId} ({AdminName}) đã phê duyệt Bước 1 cho yêu cầu rút tiền lớn #{RequestId} ({Amount:N0}đ). Đang chờ Checker phê duyệt cấp 2.",
                adminMemberId, adminName, withdrawalId, request.Amount);

            var response = MapToDto(request, request.BankAccount);
            response.RequiresMakerChecker = true;
            response.AwaitingChecker = true;
            response.Message = "Yêu cầu rút tiền lớn (> 5.000.000đ) đã được Maker duyệt bước 1. Đang chờ Checker phê duyệt cấp 2.";
            return response;
        }
        else if (request.Status == "processing")
        {
            // DT01-4 & DT01-5: Bước 2 - Checker duyệt cấp 2
            var makerSetting = await _dbContext.SystemSettings.FirstOrDefaultAsync(s => s.Key == settingKey, ct);
            WithdrawalMakerInfo? makerInfo = null;

            if (makerSetting != null && !string.IsNullOrWhiteSpace(makerSetting.Value))
            {
                try
                {
                    makerInfo = JsonSerializer.Deserialize<WithdrawalMakerInfo>(makerSetting.Value);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Không thể giải mã dữ liệu Maker cho yêu cầu #{RequestId}", withdrawalId);
                }
            }

            // DT01-4: Chặn Checker trùng Maker (Maker == Checker)
            if (makerInfo != null && (makerInfo.MakerUserId == adminUserId || (makerInfo.MakerMemberId.HasValue && makerInfo.MakerMemberId == adminMemberId)))
            {
                throw new BusinessException("[E-SEC-02] Checker phải là Quản trị viên độc lập, khác với Maker đã duyệt bước 1. Cấm tự phê duyệt kép (Maker != Checker).");
            }

            // DT01-5: Duyệt thành công bởi Checker
            request.Status = "completed";
            request.ProcessedBy = adminMemberId;
            request.ProcessedAt = now;
            request.UpdatedAt = now;

            var makerTag = makerInfo != null ? $"Maker: {makerInfo.MakerName}, " : "";
            if (request.Transaction != null)
            {
                request.Transaction.Label = FitLabel($"Rút tiền về {request.BankAccount.BankName} · {request.BankAccount.AccountNumberMask} (Thành công - {makerTag}Checker: {adminName}{refText})");
            }

            if (makerSetting != null)
            {
                _dbContext.SystemSettings.Remove(makerSetting);
            }

            await _dbContext.SaveChangesAsync(ct);

            _logger.LogInformation("Checker {AdminMemberId} ({AdminName}) đã phê duyệt Bước 2 cho yêu cầu rút tiền lớn #{RequestId} ({Amount:N0}đ). Maker: {MakerName}. Hoàn tất giải ngân.",
                adminMemberId, adminName, withdrawalId, request.Amount, makerInfo?.MakerName ?? "N/A");

            var response = MapToDto(request, request.BankAccount);
            response.RequiresMakerChecker = true;
            response.AwaitingChecker = false;
            response.Message = "Checker đã phê duyệt cấp 2 thành công. Tiền đã được giải ngân.";
            return response;
        }
        else
        {
            throw new BusinessException($"Chỉ có thể phê duyệt yêu cầu rút tiền đang ở trạng thái Chờ duyệt hoặc Chờ Checker duyệt cấp 2. Trạng thái hiện tại: {request.Status}.");
        }
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

        if (_dbContext.Database.IsRelational())
        {
            var strategy = _dbContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _dbContext.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
                var result = await RejectWithdrawalInternalAsync(adminUserId, withdrawalId, dto.Reason, ct);
                await transaction.CommitAsync(ct);
                return result;
            });
        }

        return await RejectWithdrawalInternalAsync(adminUserId, withdrawalId, dto.Reason, ct);
    }

    private async Task<WithdrawalResponseDto> RejectWithdrawalInternalAsync(
        int adminUserId,
        int withdrawalId,
        string rawReason,
        CancellationToken ct)
    {
        if (_dbContext.Database.IsMySql())
        {
            await _dbContext.Database.ExecuteSqlRawAsync("SELECT id FROM withdrawal_requests WHERE id = {0} FOR UPDATE", new object[] { withdrawalId }, ct);
        }

        var request = await _dbContext.WithdrawalRequests
            .Include(r => r.BankAccount)
            .FirstOrDefaultAsync(r => r.Id == withdrawalId, ct);

        if (request == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy yêu cầu rút tiền #{withdrawalId}.");
        }

        // [DT01-1] Chống tự thao tác trên yêu cầu rút tiền của chính mình
        if (request.UserId == adminUserId)
        {
            throw new BusinessException("[E-SEC-01] Cấm tự phê duyệt hoặc thao tác trên yêu cầu rút tiền của chính mình.");
        }

        if (request.Status != "pending" && request.Status != "processing")
        {
            throw new BusinessException($"Chỉ có thể từ chối yêu cầu rút tiền đang ở trạng thái Chờ duyệt hoặc Chờ duyệt cấp 2. Trạng thái hiện tại: {request.Status}.");
        }

        var cleanReason = CleanText(rawReason, 150) ?? "Thông tin không hợp lệ";
        var adminMemberId = await EnsureAdminMemberIdAsync(adminUserId, ct);
        var now = DateTime.UtcNow;

        // Xóa thông tin Maker nếu có
        var settingKey = $"withdrawal_maker_{withdrawalId}";
        var makerSetting = await _dbContext.SystemSettings.FirstOrDefaultAsync(s => s.Key == settingKey, ct);
        if (makerSetting != null)
        {
            _dbContext.SystemSettings.Remove(makerSetting);
        }

        // Q-011: Khóa hàng ví và hoàn tiền lại 100% cho người dùng
        var wallet = await GetWalletWithLockAsync(request.UserId, ct);

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
            Label = FitLabel($"Hoàn tiền yêu cầu rút #{request.Id} bị từ chối: {cleanReason}"),
            Amount = request.Amount,
            Sign = 1,
            ReferenceId = request.Id,
            CreatedAt = now
        };
        await _dbContext.Transactions.AddAsync(refundTx, ct);

        request.Status = "rejected";
        request.RejectReason = cleanReason;
        request.ProcessedBy = adminMemberId;
        request.ProcessedAt = now;
        request.UpdatedAt = now;

        await _dbContext.SaveChangesAsync(ct);

        _logger.LogInformation("Admin {AdminMemberId} đã từ chối yêu cầu rút #{RequestId} ({Amount:N0}đ), hoàn tiền về ví User {UserId}. Lý do: {Reason}",
            adminMemberId, request.Id, request.Amount, request.UserId, cleanReason);

        var response = MapToDto(request, request.BankAccount);
        response.RequiresMakerChecker = request.Amount > LargeWithdrawalThreshold;
        response.AwaitingChecker = false;
        response.Message = "Yêu cầu rút tiền đã bị từ chối và tiền đã được hoàn 100% về ví người dùng.";
        return response;
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
            .Select(r => MapToDto(r, r.BankAccount))
            .ToListAsync(ct);

        return new WithdrawalPagedResultDto<WithdrawalResponseDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public Task<WithdrawalPagedResultDto<AdminWithdrawalItemDto>> GetAdminWithdrawalsAsync(
        string? status = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken ct = default) => GetAdminListAsync(status, page, pageSize, ct);

    public async Task<WithdrawalPagedResultDto<AdminWithdrawalItemDto>> GetAdminListAsync(
        string? status = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 20;

        var query = _dbContext.WithdrawalRequests
            .AsNoTracking()
            .Include(r => r.BankAccount)
            .Include(r => r.User)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status.Trim(), "all", StringComparison.OrdinalIgnoreCase))
        {
            var normalizedStatus = status.Trim().ToLowerInvariant();
            query = query.Where(r => r.Status == normalizedStatus);
        }

        var totalCount = await query.CountAsync(ct);

        var rawList = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        // Tải metadata Maker cho các yêu cầu
        var processingIds = rawList.Where(r => r.Status == "processing" || r.Amount > LargeWithdrawalThreshold).Select(r => r.Id).ToList();
        var makerKeys = processingIds.Select(id => $"withdrawal_maker_{id}").ToList();
        var makerSettings = await _dbContext.SystemSettings
            .AsNoTracking()
            .Where(s => makerKeys.Contains(s.Key))
            .ToListAsync(ct);

        var makerDict = new Dictionary<int, WithdrawalMakerInfo>();
        foreach (var s in makerSettings)
        {
            if (s.Key.StartsWith("withdrawal_maker_") && int.TryParse(s.Key.Replace("withdrawal_maker_", ""), out var wId))
            {
                try
                {
                    var info = JsonSerializer.Deserialize<WithdrawalMakerInfo>(s.Value);
                    if (info != null) makerDict[wId] = info;
                }
                catch
                {
                    // Bỏ qua lỗi parse JSON metadata
                }
            }
        }

        // Lấy key 1 lần ngoài vòng lặp
        var key = _keyProvider.GetKey();

        var items = rawList.Select(r =>
        {
            string? fullAccount = null;
            bool decryptError = false;

            if (r.BankAccount != null && !string.IsNullOrWhiteSpace(r.BankAccount.AccountNumberEncrypted))
            {
                try
                {
                    fullAccount = EncryptionHelper.Decrypt(r.BankAccount.AccountNumberEncrypted, key);
                    if (string.IsNullOrWhiteSpace(fullAccount)
                        || fullAccount.Any(c => c is < '0' or > '9')
                        || (r.BankAccount.AccountNumberMask.Length >= 4 && !fullAccount.EndsWith(r.BankAccount.AccountNumberMask[^4..])))
                    {
                        decryptError = true;
                        fullAccount = null;
                    }
                }
                catch
                {
                    decryptError = true;
                    fullAccount = null;
                }
            }

            var requiresMakerChecker = r.Amount > LargeWithdrawalThreshold;
            makerDict.TryGetValue(r.Id, out var maker);

            return new AdminWithdrawalItemDto
            {
                Id = r.Id,
                UserId = r.UserId,
                UserName = r.User?.FullName ?? "N/A",
                UserEmail = r.User?.Email ?? "N/A",
                BankName = r.BankAccount?.BankName ?? "Ngân hàng",
                AccountNumberMask = r.BankAccount?.AccountNumberMask ?? "******",
                AccountNumberFull = fullAccount,
                DecryptError = decryptError,
                AccountHolderName = r.BankAccount?.AccountHolderName ?? "CHỦ TÀI KHOẢN",
                Amount = r.Amount,
                Fee = r.Fee,
                NetAmount = r.NetAmount,
                Status = r.Status,
                RejectReason = r.RejectReason,
                CreatedAt = r.CreatedAt,
                ProcessedAt = r.ProcessedAt,
                RequiresMakerChecker = requiresMakerChecker,
                MakerId = maker?.MakerUserId,
                MakerName = maker?.MakerName,
                MakerAt = maker?.MakerAt,
                MakerNote = maker?.Note,
                AwaitingChecker = requiresMakerChecker && r.Status == "processing"
            };
        }).ToList();

        return new WithdrawalPagedResultDto<AdminWithdrawalItemDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    private static WithdrawalResponseDto MapToDto(WithdrawalRequest r, BankAccount? b)
    {
        var requiresMakerChecker = r.Amount > LargeWithdrawalThreshold;
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
            ProcessedAt = r.ProcessedAt,
            RequiresMakerChecker = requiresMakerChecker,
            AwaitingChecker = requiresMakerChecker && r.Status == "processing"
        };
    }

    private async Task<Wallet?> GetWalletWithLockAsync(int userId, CancellationToken ct)
    {
        if (_dbContext.Database.IsMySql())
        {
            await _dbContext.Database.ExecuteSqlRawAsync("SELECT user_id FROM wallets WHERE user_id = {0} FOR UPDATE", new object[] { userId }, ct);
            var tracked = _dbContext.ChangeTracker.Entries<Wallet>().FirstOrDefault(e => e.Entity.UserId == userId);
            if (tracked?.State == EntityState.Unchanged)
            {
                await tracked.ReloadAsync(ct);
            }
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

    public async Task<AdminFinanceSummaryDto> GetFinanceSummaryAsync(CancellationToken ct = default)
    {
        var totalWallet = await _dbContext.Wallets
            .AsNoTracking()
            .SumAsync(w => (decimal?)w.Balance, ct) ?? 0m;

        var totalEscrow = await _dbContext.Jobs
            .AsNoTracking()
            .Where(j => j.HiredApplicantId != null && (j.Status == "in_progress" || j.Status == "submitted" || j.Status == "revision_requested"))
            .SumAsync(j => (decimal?)(j.EscrowAmount ?? j.Budget), ct) ?? 0m;

        var pendingWithdrawalsCount = await _dbContext.WithdrawalRequests
            .AsNoTracking()
            .CountAsync(w => w.Status == "pending" || w.Status == "processing", ct);

        var pendingWithdrawalsAmount = await _dbContext.WithdrawalRequests
            .AsNoTracking()
            .Where(w => w.Status == "pending" || w.Status == "processing")
            .SumAsync(w => (decimal?)w.Amount, ct) ?? 0m;

        var completedWithdrawalsCount = await _dbContext.WithdrawalRequests
            .AsNoTracking()
            .CountAsync(w => w.Status == "completed", ct);

        var completedWithdrawalsAmount = await _dbContext.WithdrawalRequests
            .AsNoTracking()
            .Where(w => w.Status == "completed")
            .SumAsync(w => (decimal?)w.Amount, ct) ?? 0m;

        var totalWithdrawalsCount = await _dbContext.WithdrawalRequests
            .AsNoTracking()
            .CountAsync(ct);

        return new AdminFinanceSummaryDto
        {
            TotalWalletBalance = totalWallet,
            TotalEscrowBalance = totalEscrow,
            PendingWithdrawalsCount = pendingWithdrawalsCount,
            PendingWithdrawalsAmount = pendingWithdrawalsAmount,
            CompletedWithdrawalsCount = completedWithdrawalsCount,
            CompletedWithdrawalsAmount = completedWithdrawalsAmount,
            TotalWithdrawalsCount = totalWithdrawalsCount
        };
    }
}
