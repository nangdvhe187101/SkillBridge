using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using QRCoder;
using SkiaSharp;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Payments;
using SkillBridge.Application.Interfaces.Payments;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using ZXing.SkiaSharp;

namespace SkillBridge.Infrastructure.Services.Payments;

public class BankVerificationService : IBankVerificationService
{
    private readonly SkillBridgeDbContext _dbContext;
    private readonly ILogger<BankVerificationService> _logger;
    private readonly string? _encryptionKey;

    public BankVerificationService(
        SkillBridgeDbContext dbContext,
        ILogger<BankVerificationService> logger,
        IConfiguration? configuration = null)
    {
        _dbContext = dbContext;
        _logger = logger;
        _encryptionKey = configuration?["Encryption:Key"];
    }

    public async Task<BankVerificationResponseDto> CreateRequestAsync(int userId, CreateBankVerificationDto dto, string? ipAddress = null, CancellationToken ct = default)
    {
        if (dto == null)
        {
            throw new BusinessException("Dữ liệu yêu cầu không hợp lệ.");
        }

        if (string.IsNullOrWhiteSpace(dto.BankName) || string.IsNullOrWhiteSpace(dto.BankCode))
        {
            throw new BusinessException("Vui lòng chọn ngân hàng thụ hưởng.");
        }

        if (string.IsNullOrWhiteSpace(dto.AccountNumber))
        {
            throw new BusinessException("Vui lòng nhập số tài khoản ngân hàng.");
        }

        var cleanAccount = dto.AccountNumber.Trim().Replace(" ", "").Replace("-", "");
        if (cleanAccount.Length < 6 || cleanAccount.Length > 20 || !cleanAccount.All(char.IsDigit))
        {
            throw new BusinessException("Số tài khoản không hợp lệ (phải từ 6-20 chữ số).");
        }

        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null)
        {
            throw new BusinessException("Không tìm thấy thông tin người dùng trong hệ thống.");
        }

        // Rule 1: 1 user chỉ có tối đa 1 record pending tại 1 thời điểm
        var hasPending = await _dbContext.BankVerificationRequests
            .AnyAsync(r => r.UserId == userId && r.Status == BankVerificationStatus.Pending, ct);

        if (hasPending)
        {
            throw new BusinessException("Bạn đang có một yêu cầu xác thực đang chờ duyệt. Vui lòng chờ admin xử lý hoặc hủy yêu cầu trước khi tạo mới.");
        }

        // Rule 2: Rate limit: tối đa 3 lần/ngày, 10 lần/tháng mỗi user
        var oneDayAgo = DateTime.UtcNow.AddHours(-24);
        var dailyCount = await _dbContext.BankVerificationRequests
            .CountAsync(r => r.UserId == userId && r.SubmittedAt >= oneDayAgo, ct);

        if (dailyCount >= 3)
        {
            throw new BusinessException("Bạn đã vượt quá giới hạn tạo yêu cầu xác thực trong ngày (tối đa 3 lần/ngày).");
        }

        var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);
        var monthlyCount = await _dbContext.BankVerificationRequests
            .CountAsync(r => r.UserId == userId && r.SubmittedAt >= thirtyDaysAgo, ct);

        if (monthlyCount >= 10)
        {
            throw new BusinessException("Bạn đã vượt quá giới hạn tạo yêu cầu xác thực trong tháng (tối đa 10 lần/tháng).");
        }

        // Rule 5: Đổi STK sau khi đã verified: hạ cờ Wallet.IsBankVerified = false ngay khi có yêu cầu mới được tạo
        var wallet = await _dbContext.Wallets.FirstOrDefaultAsync(w => w.UserId == userId, ct);
        if (wallet != null && wallet.IsBankVerified)
        {
            wallet.IsBankVerified = false;
        }

        var encryptedAccount = EncryptionHelper.Encrypt(cleanAccount, _encryptionKey);
        var mask = EncryptionHelper.MaskAccountNumber(cleanAccount);

        var request = new BankVerificationRequest
        {
            UserId = userId,
            BankName = dto.BankName.Trim(),
            BankCode = dto.BankCode.Trim(),
            AccountNumber = encryptedAccount,
            AccountNumberMask = mask,
            Status = BankVerificationStatus.Pending,
            SubmittedAt = DateTime.UtcNow,
            RequestIpAddress = ipAddress
        };

        await _dbContext.BankVerificationRequests.AddAsync(request, ct);
        await _dbContext.SaveChangesAsync(ct);

        _logger.LogInformation("Người dùng {UserId} đã tạo yêu cầu xác thực ngân hàng #{RequestId} ({BankName} - {Mask})", 
            userId, request.Id, request.BankName, mask);

        return MapToResponseDto(request);
    }

    public Task<DecodeQrResponseDto> DecodeQrImageAsync(Stream stream, string fileName, CancellationToken ct = default)
    {
        if (stream == null || stream.Length == 0)
        {
            throw new BusinessException("Vui lòng tải lên file ảnh mã QR.");
        }

        var ext = Path.GetExtension(fileName)?.ToLowerInvariant();
        if (ext != ".jpg" && ext != ".jpeg" && ext != ".png")
        {
            throw new BusinessException("Chỉ chấp nhận file ảnh định dạng .jpg, .jpeg hoặc .png.");
        }

        if (stream.Length > 5 * 1024 * 1024)
        {
            throw new BusinessException("Kích thước file ảnh không được vượt quá 5MB.");
        }

        stream.Position = 0;
        using var skBitmap = SKBitmap.Decode(stream);
        if (skBitmap == null)
        {
            throw new BusinessException("Không thể đọc định dạng hình ảnh tải lên.");
        }

        var barcodeReader = new BarcodeReader();
        var result = barcodeReader.Decode(skBitmap);

        if (result == null || string.IsNullOrWhiteSpace(result.Text))
        {
            throw new BusinessException("Không tìm thấy mã QR hợp lệ trong ảnh. Vui lòng thử ảnh rõ nét hơn hoặc nhập tay.");
        }

        var rawText = result.Text.Trim();
        if (!VietQrHelper.TryParsePayload(rawText, out var bankBin, out var accountNumber))
        {
            throw new BusinessException("Mã QR không đúng định dạng chuẩn VietQR/EMVCo ngân hàng. Vui lòng kiểm tra lại hoặc nhập thông tin bằng tay.");
        }

        return Task.FromResult(new DecodeQrResponseDto
        {
            BankCode = bankBin!,
            AccountNumber = accountNumber!,
            RawPayload = rawText,
            Message = "Trích xuất thông tin thành công từ mã QR."
        });
    }

    public async Task<BankVerificationResponseDto> CancelRequestAsync(int userId, int requestId, CancellationToken ct = default)
    {
        var request = await _dbContext.BankVerificationRequests
            .FirstOrDefaultAsync(r => r.Id == requestId && r.UserId == userId, ct);

        if (request == null)
        {
            throw new BusinessException("Không tìm thấy yêu cầu xác thực.");
        }

        if (request.Status != BankVerificationStatus.Pending)
        {
            throw new BusinessException("Chỉ có thể hủy yêu cầu đang ở trạng thái chờ duyệt (Pending).");
        }

        request.Status = BankVerificationStatus.Cancelled;
        await _dbContext.SaveChangesAsync(ct);

        _logger.LogInformation("Người dùng {UserId} đã tự hủy yêu cầu xác thực ngân hàng #{RequestId}", userId, requestId);

        return MapToResponseDto(request);
    }

    public async Task<BankVerificationResponseDto?> GetCurrentVerificationAsync(int userId, CancellationToken ct = default)
    {
        var request = await _dbContext.BankVerificationRequests
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.SubmittedAt)
            .FirstOrDefaultAsync(ct);

        return request != null ? MapToResponseDto(request) : null;
    }

    public async Task<BankVerificationPagedResultDto<AdminBankVerificationItemDto>> GetAdminListAsync(string? status, int page, int pageSize, CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _dbContext.BankVerificationRequests
            .AsNoTracking()
            .Include(r => r.User)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (Enum.TryParse<BankVerificationStatus>(status, true, out var parsedStatus))
            {
                query = query.Where(r => r.Status == parsedStatus);
            }
        }
        else
        {
            query = query.Where(r => r.Status == BankVerificationStatus.Pending);
        }

        var totalCount = await query.CountAsync(ct);

        // Quy tắc hiển thị Admin: sắp xếp theo thời gian nộp cũ nhất trước (Oldest first)
        var items = await query
            .OrderBy(r => r.SubmittedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new AdminBankVerificationItemDto
            {
                Id = r.Id,
                UserId = r.UserId,
                UserName = r.User.FullName,
                UserEmail = r.User.Email,
                BankName = r.BankName,
                BankCode = r.BankCode,
                AccountNumberMask = r.AccountNumberMask,
                Status = r.Status.ToString().ToLowerInvariant(),
                SubmittedAt = r.SubmittedAt
            })
            .ToListAsync(ct);

        return new BankVerificationPagedResultDto<AdminBankVerificationItemDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<AdminBankVerificationDetailDto> GetAdminDetailAsync(int requestId, CancellationToken ct = default)
    {
        var request = await _dbContext.BankVerificationRequests
            .AsNoTracking()
            .Include(r => r.User)
            .Include(r => r.ReviewedByAdmin)
            .FirstOrDefaultAsync(r => r.Id == requestId, ct);

        if (request == null)
        {
            throw new BusinessException("Không tìm thấy yêu cầu xác thực.");
        }

        // Giải mã STK cho màn hình chi tiết admin
        var plainAccount = EncryptionHelper.Decrypt(request.AccountNumber, _encryptionKey);

        // Sinh mới mã QR chuẩn VietQR cho admin quét bằng app ngân hàng
        string? qrBase64 = null;
        try
        {
            var vietQrPayload = VietQrHelper.GeneratePayload(request.BankCode, plainAccount);
            using var qrGenerator = new QRCodeGenerator();
            using var qrData = qrGenerator.CreateQrCode(vietQrPayload, QRCodeGenerator.ECCLevel.Q);
            using var pngByteQr = new PngByteQRCode(qrData);
            var qrBytes = pngByteQr.GetGraphic(20);
            qrBase64 = "data:image/png;base64," + Convert.ToBase64String(qrBytes);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Không thể sinh mã QR cho yêu cầu #{RequestId}: {Message}", requestId, ex.Message);
        }

        var normalizedUser = VietnameseConverter.RemoveVietnameseTones(request.User?.FullName);

        return new AdminBankVerificationDetailDto
        {
            Id = request.Id,
            UserId = request.UserId,
            UserName = request.User?.FullName ?? string.Empty,
            UserEmail = request.User?.Email ?? string.Empty,
            NormalizedUserName = normalizedUser,
            BankName = request.BankName,
            BankCode = request.BankCode,
            AccountNumber = plainAccount,
            AccountNumberMask = request.AccountNumberMask,
            QrCodeBase64 = qrBase64,
            Status = request.Status.ToString().ToLowerInvariant(),
            SubmittedAt = request.SubmittedAt,
            ReviewedAt = request.ReviewedAt,
            ReviewedByAdminId = request.ReviewedByAdminId,
            ReviewedByAdminName = request.ReviewedByAdmin?.Name,
            RejectionReason = request.RejectionReason,
            BankReturnedName = request.BankReturnedName,
            RequestIpAddress = request.RequestIpAddress
        };
    }

    public async Task<BankVerificationResponseDto> ApproveRequestAsync(int adminUserId, int requestId, AdminApproveBankVerificationDto dto, CancellationToken ct = default)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.BankReturnedName))
        {
            throw new BusinessException("Vui lòng nhập tên chủ tài khoản đọc được từ app ngân hàng (BankReturnedName).");
        }

        var request = await _dbContext.BankVerificationRequests
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Id == requestId, ct);

        if (request == null)
        {
            throw new BusinessException("Không tìm thấy yêu cầu xác thực.");
        }

        if (request.Status != BankVerificationStatus.Pending)
        {
            throw new BusinessException("Chỉ có thể duyệt yêu cầu đang ở trạng thái chờ duyệt (Pending).");
        }

        var adminMemberId = await EnsureAdminMemberIdAsync(adminUserId, ct);
        var cleanReturnedName = dto.BankReturnedName.Trim().ToUpper();

        // So khớp tên tự động hỗ trợ admin cảnh báo nếu không khớp
        var cleanProfileName = VietnameseConverter.RemoveVietnameseTones(request.User.FullName);
        var cleanReturnedConverted = VietnameseConverter.RemoveVietnameseTones(cleanReturnedName);
        if (!string.Equals(cleanProfileName, cleanReturnedConverted, StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("Admin {AdminMemberId} phê duyệt yêu cầu #{RequestId} dù tên không khớp hoàn toàn: Hồ sơ [{Profile}] vs Ngân hàng [{Returned}]",
                adminMemberId, requestId, cleanProfileName, cleanReturnedConverted);
        }

        request.Status = BankVerificationStatus.Approved;
        request.BankReturnedName = cleanReturnedName;
        request.ReviewedAt = DateTime.UtcNow;
        request.ReviewedByAdminId = adminMemberId;

        // Rule: Khi 1 request được Approved, tự động Cancelled toàn bộ request Pending khác của cùng user
        var otherPendingRequests = await _dbContext.BankVerificationRequests
            .Where(r => r.UserId == request.UserId && r.Id != request.Id && r.Status == BankVerificationStatus.Pending)
            .ToListAsync(ct);

        foreach (var pending in otherPendingRequests)
        {
            pending.Status = BankVerificationStatus.Cancelled;
        }

        // Cập nhật ví user: IsBankVerified = true
        var plainAccount = EncryptionHelper.Decrypt(request.AccountNumber, _encryptionKey);
        var wallet = await _dbContext.Wallets.FirstOrDefaultAsync(w => w.UserId == request.UserId, ct);
        if (wallet == null)
        {
            wallet = new Wallet
            {
                UserId = request.UserId,
                Balance = 0
            };
            await _dbContext.Wallets.AddAsync(wallet, ct);
        }

        wallet.BankName = request.BankName;
        wallet.BankBin = request.BankCode;
        wallet.AccountNumber = plainAccount;
        wallet.AccountHolder = cleanReturnedName;
        wallet.IsBankVerified = true;
        wallet.BankLinkedAt = request.ReviewedAt;

        // Đồng bộ bản ghi BankAccount nếu có
        var bankAccount = await _dbContext.BankAccounts
            .FirstOrDefaultAsync(b => b.UserId == request.UserId && b.AccountNumberMask == request.AccountNumberMask, ct);

        if (bankAccount == null)
        {
            bankAccount = new BankAccount
            {
                UserId = request.UserId,
                BankName = request.BankName,
                AccountNumberEncrypted = request.AccountNumber,
                AccountNumberMask = request.AccountNumberMask,
                AccountHolderName = cleanReturnedName,
                IsDefault = true,
                IsVerified = true,
                VerifiedAt = request.ReviewedAt,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await _dbContext.BankAccounts.AddAsync(bankAccount, ct);
        }
        else
        {
            bankAccount.IsVerified = true;
            bankAccount.VerifiedAt = request.ReviewedAt;
            bankAccount.AccountHolderName = cleanReturnedName;
            bankAccount.UpdatedAt = DateTime.UtcNow;
        }

        await _dbContext.SaveChangesAsync(ct);

        _logger.LogInformation("Admin {AdminMemberId} đã duyệt yêu cầu xác thực #{RequestId} cho User {UserId} ({BankName} - {AccountMask})",
            adminMemberId, requestId, request.UserId, request.BankName, request.AccountNumberMask);

        return MapToResponseDto(request);
    }

    public async Task<BankVerificationResponseDto> RejectRequestAsync(int adminUserId, int requestId, AdminRejectBankVerificationDto dto, CancellationToken ct = default)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.RejectionReason))
        {
            throw new BusinessException("Vui lòng cung cấp lý do từ chối yêu cầu xác thực.");
        }

        var request = await _dbContext.BankVerificationRequests
            .FirstOrDefaultAsync(r => r.Id == requestId, ct);

        if (request == null)
        {
            throw new BusinessException("Không tìm thấy yêu cầu xác thực.");
        }

        if (request.Status != BankVerificationStatus.Pending)
        {
            throw new BusinessException("Chỉ có thể từ chối yêu cầu đang ở trạng thái chờ duyệt (Pending).");
        }

        var adminMemberId = await EnsureAdminMemberIdAsync(adminUserId, ct);

        request.Status = BankVerificationStatus.Rejected;
        request.RejectionReason = dto.RejectionReason.Trim();
        request.ReviewedAt = DateTime.UtcNow;
        request.ReviewedByAdminId = adminMemberId;

        await _dbContext.SaveChangesAsync(ct);

        _logger.LogInformation("Admin {AdminMemberId} đã từ chối yêu cầu xác thực #{RequestId} (Lý do: {Reason})",
            adminMemberId, requestId, request.RejectionReason);

        return MapToResponseDto(request);
    }

    private async Task<int?> EnsureAdminMemberIdAsync(int adminUserId, CancellationToken ct)
    {
        var adminUser = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == adminUserId, ct);
        if (adminUser == null)
        {
            return null;
        }

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

    private static BankVerificationResponseDto MapToResponseDto(BankVerificationRequest r)
    {
        return new BankVerificationResponseDto
        {
            Id = r.Id,
            BankName = r.BankName,
            BankCode = r.BankCode,
            AccountNumberMask = r.AccountNumberMask,
            Status = r.Status.ToString().ToLowerInvariant(),
            SubmittedAt = r.SubmittedAt,
            ReviewedAt = r.ReviewedAt,
            RejectionReason = r.RejectionReason,
            BankReturnedName = r.BankReturnedName
        };
    }
}
