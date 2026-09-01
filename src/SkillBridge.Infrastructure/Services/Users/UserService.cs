using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Storage;
using SkillBridge.Application.DTOs.Users;
using SkillBridge.Application.Interfaces.Storage;
using SkillBridge.Application.Interfaces.Users;
using SkillBridge.Infrastructure.Data;

namespace SkillBridge.Infrastructure.Services.Users;

public class UserService : IUserService
{
    private readonly SkillBridgeDbContext _dbContext;
    private readonly IStorageService _storageService;
    private readonly ILogger<UserService> _logger;

    public UserService(
        SkillBridgeDbContext dbContext,
        IStorageService storageService,
        ILogger<UserService> logger)
    {
        _dbContext = dbContext;
        _storageService = storageService;
        _logger = logger;
    }

    public async Task<UserProfileDto> GetProfileAsync(int userId, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user == null)
        {
            throw new BusinessException("Người dùng không tồn tại.");
        }

        return MapToProfileDto(user);
    }

    public async Task<UserProfileDto> UpdateProfileAsync(
        int userId,
        UpdateUserProfileRequest request,
        CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user == null)
        {
            throw new BusinessException("Người dùng không tồn tại.");
        }

        if (!string.IsNullOrWhiteSpace(request.FullName))
            user.FullName = request.FullName.Trim();

        if (request.PhoneNumber != null)
        {
            var rawPhone = request.PhoneNumber.Trim();
            if (string.IsNullOrWhiteSpace(rawPhone))
            {
                user.PhoneNumber = null; // Cho phép xóa số điện thoại
            }
            else
            {
                if (!ValidationPatterns.Phone.IsMatch(rawPhone))
                {
                    throw new BusinessException("Số điện thoại không hợp lệ (cần đúng định dạng 10 số di động VN).");
                }

                var isDuplicate = await _dbContext.Users
                    .AnyAsync(u => u.PhoneNumber == rawPhone && u.Id != userId, cancellationToken);
                if (isDuplicate)
                {
                    throw new BusinessException("Số điện thoại này đã được sử dụng bởi một tài khoản khác.");
                }

                user.PhoneNumber = rawPhone;
            }
        }

        if (request.School != null)
            user.School = string.IsNullOrWhiteSpace(request.School) ? null : request.School.Trim();

        if (request.Industry != null)
            user.Industry = string.IsNullOrWhiteSpace(request.Industry) ? null : request.Industry.Trim();

        if (request.CompanySize != null)
            user.CompanySize = string.IsNullOrWhiteSpace(request.CompanySize) ? null : request.CompanySize.Trim();

        if (request.Website != null)
            user.Website = string.IsNullOrWhiteSpace(request.Website) ? null : request.Website.Trim();

        if (request.CompanyDescription != null)
            user.CompanyDescription = string.IsNullOrWhiteSpace(request.CompanyDescription) ? null : request.CompanyDescription.Trim();

        await _dbContext.SaveChangesAsync(cancellationToken);
        return MapToProfileDto(user);
    }

    public async Task<FileUploadResult> UploadAvatarAsync(
        int userId,
        Stream stream,
        string fileName,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        if (stream == null || stream.Length == 0)
        {
            throw new BusinessException("Dữ liệu ảnh đại diện không hợp lệ.");
        }

        if (stream.Length > 5 * 1024 * 1024)
        {
            throw new BusinessException("Dung lượng ảnh đại diện vượt quá giới hạn cho phép (tối đa 5MB).");
        }

        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
        if (!allowedExtensions.Contains(ext))
        {
            throw new BusinessException("Định dạng file ảnh không được hỗ trợ. Vui lòng chọn JPG, PNG, WEBP hoặc GIF.");
        }

        // Validate denylist dangerous signatures
        FileSignatureValidator.ValidateSafeFile(stream, fileName);

        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null)
        {
            throw new BusinessException("Người dùng không tồn tại.");
        }

        // Upload ảnh mới vào folder "avatars"
        var uploadResult = await _storageService.UploadStreamAsync(
            stream,
            fileName,
            contentType,
            folder: "avatars",
            cancellationToken: cancellationToken);

        // Nếu trước đó có avatar URL từ R2, xóa dọn dẹp avatar cũ
        if (!string.IsNullOrWhiteSpace(user.AvatarUrl) && user.AvatarUrl.Contains("avatars/"))
        {
            try
            {
                var idx = user.AvatarUrl.IndexOf("avatars/", StringComparison.OrdinalIgnoreCase);
                if (idx >= 0)
                {
                    var oldKey = user.AvatarUrl.Substring(idx).Split('?')[0];
                    await _storageService.DeleteFileAsync(oldKey, cancellationToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Không thể xóa avatar cũ của UserId {UserId}.", userId);
            }
        }

        user.AvatarUrl = uploadResult.FileUrl;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return uploadResult;
    }

    private static UserProfileDto MapToProfileDto(Data.Entities.User user)
    {
        return new UserProfileDto
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            AvatarUrl = user.AvatarUrl,
            RoleName = user.Role?.Name ?? "student",
            School = user.School,
            Industry = user.Industry,
            CompanySize = user.CompanySize,
            Website = user.Website,
            CompanyDescription = user.CompanyDescription,
            KycStatus = user.KycStatus ?? "pending",
            AccountStatus = user.AccountStatus ?? "active",
            ReliabilityScore = user.ReliabilityScore,
            JobsDoneCount = user.JobsDoneCount,
            ReferralCode = user.ReferralCode,
            JoinedAt = user.JoinedAt
        };
    }
}
