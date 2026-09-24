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
using SkillBridge.Infrastructure.Data.Entities;

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

        user.AvatarUrl = uploadResult.FileKey;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return uploadResult;
    }

    public async Task<UserPublicProfileDto> GetPublicStudentProfileAsync(int studentId, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users
            .Include(u => u.Role)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == studentId, cancellationToken);

        if (user == null)
        {
            throw new BusinessException("Không tìm thấy thông tin sinh viên này.");
        }

        var completedJobs = await _dbContext.Applications
            .CountAsync(a => a.StudentId == studentId && a.Status == "completed", cancellationToken);

        var reviews = await _dbContext.Reviews
            .Include(r => r.Reviewer)
            .Include(r => r.Job)
            .Where(r => r.RevieweeId == studentId)
            .OrderByDescending(r => r.CreatedAt)
            .Take(10)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var avgRating = reviews.Count > 0
            ? Math.Round(reviews.Average(r => r.Stars), 1)
            : 5.0;

        var cvCategories = await _dbContext.CvFiles
            .Include(c => c.Category)
            .Where(c => c.StudentId == studentId && c.Category != null)
            .Select(c => c.Category!.Name)
            .Distinct()
            .ToListAsync(cancellationToken);

        var skills = cvCategories.Count > 0
            ? cvCategories
            : new List<string> { "Kỹ năng chuyên môn", "Giao tiếp & Làm việc nhóm", "Đúng hạn deadline" };

        return new UserPublicProfileDto
        {
            Id = user.Id,
            FullName = user.FullName,
            AvatarUrl = _storageService.GetPublicUrl(user.AvatarUrl),
            School = user.School ?? "Đại học / Cao đẳng",
            Bio = user.CompanyDescription ?? "Sinh viên nhiệt huyết, cam kết chất lượng sản phẩm và tiến độ hoàn thành đúng hạn trên SkillBridge.",
            RoleCode = user.Role?.Name ?? "student",
            ReliabilityScore = user.ReliabilityScore,
            CompletedJobsCount = Math.Max(completedJobs, user.JobsDoneCount),
            AverageRating = avgRating,
            TotalReviewsCount = reviews.Count,
            IsKycVerified = string.Equals(user.KycStatus, "verified", StringComparison.OrdinalIgnoreCase),
            GraduationYear = null,
            Skills = skills,
            Reviews = reviews.ConvertAll(r => new UserReviewItemDto
            {
                Id = r.Id,
                ReviewerName = r.Reviewer?.FullName ?? "Nhà tuyển dụng",
                ReviewerAvatarUrl = _storageService.GetPublicUrl(r.Reviewer?.AvatarUrl),
                JobTitle = r.Job?.Title ?? "Dự án đã hoàn thành",
                Stars = r.Stars,
                Comment = r.Comment ?? string.Empty,
                CreatedAt = r.CreatedAt
            })
        };
    }

    /**
     * @ears .sdd/features/feat-profile-data-sync/SPEC.md#REQ-PROF-02
     */
    public async Task<System.Collections.Generic.List<PortfolioItemDto>> GetPortfolioAsync(int userId, CancellationToken cancellationToken = default)
    {
        var items = await _dbContext.PortfolioUploads
            .AsNoTracking()
            .Where(p => p.StudentId == userId)
            .OrderByDescending(p => p.UploadedAt)
            .ToListAsync(cancellationToken);

        return items.Select(p => new PortfolioItemDto
        {
            Id = p.Id,
            FileName = p.FileName,
            FileType = p.FileType,
            FileUrl = _storageService.GetPublicUrl(p.FileUrl),
            UploadedAt = p.UploadedAt
        }).ToList();
    }

    /**
     * @ears .sdd/features/feat-profile-data-sync/SPEC.md#REQ-PROF-02
     */
    public async Task<PortfolioItemDto> UploadPortfolioAsync(
        int userId,
        Stream stream,
        string fileName,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users.FindAsync(new object[] { userId }, cancellationToken);
        if (user == null)
            throw new BusinessException("Người dùng không tồn tại.");

        var uploadResult = await _storageService.UploadStreamAsync(
            stream,
            fileName,
            contentType,
            folder: "portfolios",
            cancellationToken: cancellationToken);

        var portfolio = new PortfolioUpload
        {
            StudentId = userId,
            FileName = fileName,
            FileType = contentType,
            FileUrl = uploadResult.FileKey,
            UploadedAt = DateTime.UtcNow
        };

        _dbContext.PortfolioUploads.Add(portfolio);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new PortfolioItemDto
        {
            Id = portfolio.Id,
            FileName = portfolio.FileName,
            FileType = portfolio.FileType,
            FileUrl = uploadResult.FileUrl,
            UploadedAt = portfolio.UploadedAt
        };
    }

    /**
     * @ears .sdd/features/feat-profile-data-sync/SPEC.md#REQ-PROF-02
     */
    public async Task DeletePortfolioAsync(int userId, int portfolioId, CancellationToken cancellationToken = default)
    {
        var item = await _dbContext.PortfolioUploads
            .FirstOrDefaultAsync(p => p.Id == portfolioId, cancellationToken);

        if (item == null)
            throw new BusinessException("Tác phẩm không tồn tại.");

        if (item.StudentId != userId)
            throw new BusinessException("Bạn không có quyền xóa tác phẩm này.");

        if (!string.IsNullOrWhiteSpace(item.FileUrl))
        {
            try
            {
                await _storageService.DeleteFileAsync(item.FileUrl, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Lỗi khi xóa file portfolio {FileUrl} từ storage.", item.FileUrl);
            }
        }

        _dbContext.PortfolioUploads.Remove(item);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    /**
     * @ears .sdd/features/feat-profile-data-sync/SPEC.md#REQ-PROF-03
     */
    public async Task<System.Collections.Generic.List<UserBadgeItemDto>> GetUserBadgesAsync(int userId, CancellationToken cancellationToken = default)
    {
        var badges = await _dbContext.UserBadges
            .AsNoTracking()
            .Where(b => b.UserId == userId)
            .Include(b => b.Badge)
            .ThenInclude(sb => sb.Category)
            .OrderByDescending(b => b.GrantedAt)
            .ToListAsync(cancellationToken);

        return badges.Select(b => new UserBadgeItemDto
        {
            Id = b.Id,
            BadgeId = b.BadgeId,
            Name = b.Badge?.Name ?? "Huy hiệu",
            Description = b.Badge?.Description,
            CategoryName = b.Badge?.Category?.Name,
            GrantedReason = b.GrantedReason,
            GrantedAt = b.GrantedAt
        }).ToList();
    }

    private UserProfileDto MapToProfileDto(Data.Entities.User user)
    {
        return new UserProfileDto
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            AvatarUrl = _storageService.GetPublicUrl(user.AvatarUrl),
            RoleCode = user.Role?.Code ?? "student",
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
