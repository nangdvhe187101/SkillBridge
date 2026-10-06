using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
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
            .Include(u => u.StudentProfile)
            .ThenInclude(p => p!.School)
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
            .Include(u => u.StudentProfile)
            .ThenInclude(p => p!.School)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user == null)
        {
            throw new BusinessException("Người dùng không tồn tại.");
        }

        var isStudentVerified = string.Equals(user.KycStatus, "verified", StringComparison.OrdinalIgnoreCase);

        if (!isStudentVerified)
        {
            if (!string.IsNullOrWhiteSpace(request.FullName))
                user.FullName = request.FullName.Trim();

            if (request.SchoolId.HasValue && request.SchoolId.Value > 0)
            {
                user.SchoolId = request.SchoolId.Value;
                var matchedSchool = await _dbContext.Schools.FindAsync(new object[] { request.SchoolId.Value }, cancellationToken);
                if (matchedSchool != null)
                {
                    user.School = matchedSchool.Name;
                }
            }
            else if (request.School != null)
            {
                user.School = string.IsNullOrWhiteSpace(request.School) ? null : request.School.Trim();
            }

            if (request.StudentCode != null)
            {
                user.StudentCode = string.IsNullOrWhiteSpace(request.StudentCode) ? null : request.StudentCode.Trim().ToUpperInvariant();
            }

            if (request.GraduationYear.HasValue)
            {
                user.GraduationYear = request.GraduationYear.Value > 0 ? request.GraduationYear.Value : null;
            }
        }

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

        if (request.Industry != null)
            user.Industry = string.IsNullOrWhiteSpace(request.Industry) ? null : request.Industry.Trim();

        if (request.CompanySize != null)
            user.CompanySize = string.IsNullOrWhiteSpace(request.CompanySize) ? null : request.CompanySize.Trim();

        if (request.Website != null)
            user.Website = string.IsNullOrWhiteSpace(request.Website) ? null : request.Website.Trim();

        if (request.CompanyDescription != null)
            user.CompanyDescription = string.IsNullOrWhiteSpace(request.CompanyDescription) ? null : request.CompanyDescription.Trim();

        if (request.Headline != null)
            user.Headline = string.IsNullOrWhiteSpace(request.Headline) ? null : request.Headline.Trim();

        if (request.Bio != null)
            user.Bio = string.IsNullOrWhiteSpace(request.Bio) ? null : request.Bio.Trim();

        if (request.ExpectedHourlyRate.HasValue)
            user.ExpectedHourlyRate = request.ExpectedHourlyRate.Value > 0 ? request.ExpectedHourlyRate.Value : null;

        if (request.TaxCode != null)
            user.TaxCode = string.IsNullOrWhiteSpace(request.TaxCode) ? null : request.TaxCode.Trim();

        if (request.Representative != null)
            user.Representative = string.IsNullOrWhiteSpace(request.Representative) ? null : request.Representative.Trim();

        if (request.Address != null)
            user.Address = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim();

        if (request.CoverImageUrl != null)
            user.CoverImageUrl = string.IsNullOrWhiteSpace(request.CoverImageUrl) ? null : request.CoverImageUrl.Trim();

        if (request.Skills != null)
            user.SkillsJson = SafeSerialize(request.Skills);

        if (request.Education != null)
            user.EducationJson = SafeSerialize(request.Education);

        if (request.Experiences != null)
            user.ExperienceJson = SafeSerialize(request.Experiences);

        if (request.SocialLinks != null)
            user.SocialLinksJson = SafeSerialize(request.SocialLinks);

        if (request.Benefits != null)
            user.BenefitsJson = SafeSerialize(request.Benefits);

        if (request.OfficeImages != null)
            user.OfficeImagesJson = SafeSerialize(request.OfficeImages);

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

    public async Task<FileUploadResult> UploadCoverAsync(
        int userId,
        Stream stream,
        string fileName,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        if (stream == null || stream.Length == 0)
        {
            throw new BusinessException("Dữ liệu ảnh bìa không hợp lệ.");
        }

        if (stream.Length > 10 * 1024 * 1024)
        {
            throw new BusinessException("Dung lượng ảnh bìa vượt quá giới hạn cho phép (tối đa 10MB).");
        }

        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        if (!allowedExtensions.Contains(ext))
        {
            throw new BusinessException("Định dạng file ảnh không được hỗ trợ. Vui lòng chọn JPG, PNG hoặc WEBP.");
        }

        FileSignatureValidator.ValidateSafeFile(stream, fileName);

        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null)
        {
            throw new BusinessException("Người dùng không tồn tại.");
        }

        var uploadResult = await _storageService.UploadStreamAsync(
            stream,
            fileName,
            contentType,
            folder: "covers",
            cancellationToken: cancellationToken);

        if (!string.IsNullOrWhiteSpace(user.CoverImageUrl) && user.CoverImageUrl.Contains("covers/"))
        {
            try
            {
                var idx = user.CoverImageUrl.IndexOf("covers/", StringComparison.OrdinalIgnoreCase);
                if (idx >= 0)
                {
                    var oldKey = user.CoverImageUrl.Substring(idx).Split('?')[0];
                    await _storageService.DeleteFileAsync(oldKey, cancellationToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Không thể xóa ảnh bìa cũ của UserId {UserId}.", userId);
            }
        }

        user.CoverImageUrl = uploadResult.FileKey;
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
            .Take(20)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var avgRating = reviews.Count > 0
            ? Math.Round(reviews.Average(r => r.Stars), 1)
            : 5.0;

        // Skills: ưu tiên skillsJson người dùng cấu hình, fallback sang categories từ CV đã upload
        var customSkills = SafeDeserialize(user.SkillsJson, new List<string>());
        if (customSkills.Count == 0)
        {
            var cvCategories = await _dbContext.CvFiles
                .Include(c => c.Category)
                .Where(c => c.StudentId == studentId && c.Category != null)
                .Select(c => c.Category!.Name)
                .Distinct()
                .ToListAsync(cancellationToken);

            if (cvCategories.Count > 0)
            {
                customSkills = cvCategories;
            }
        }

        var portfolios = await _dbContext.PortfolioUploads
            .AsNoTracking()
            .Where(p => p.StudentId == studentId)
            .OrderByDescending(p => p.UploadedAt)
            .Take(12)
            .Select(p => new PortfolioItemDto
            {
                Id = p.Id,
                FileName = p.FileName,
                FileType = p.FileType,
                FileUrl = _storageService.GetPublicUrl(p.FileUrl),
                UploadedAt = p.UploadedAt
            })
            .ToListAsync(cancellationToken);

        var badges = await _dbContext.UserBadges
            .AsNoTracking()
            .Where(b => b.UserId == studentId)
            .Include(b => b.Badge)
            .ThenInclude(sb => sb.Category)
            .OrderByDescending(b => b.GrantedAt)
            .Select(b => new UserBadgeItemDto
            {
                Id = b.Id,
                BadgeId = b.BadgeId,
                Name = b.Badge!.Name,
                Description = b.Badge.Description,
                CategoryName = b.Badge.Category != null ? b.Badge.Category.Name : null,
                GrantedReason = b.GrantedReason,
                GrantedAt = b.GrantedAt
            })
            .ToListAsync(cancellationToken);

        return new UserPublicProfileDto
        {
            Id = user.Id,
            FullName = user.FullName,
            AvatarUrl = _storageService.GetPublicUrl(user.AvatarUrl),
            CoverImageUrl = _storageService.GetPublicUrl(user.CoverImageUrl),
            Headline = user.Headline,
            School = user.School,
            Industry = user.Industry,
            Bio = user.Bio ?? user.CompanyDescription,
            RoleCode = user.Role?.Code ?? "student",
            ReliabilityScore = user.ReliabilityScore,
            CompletedJobsCount = Math.Max(completedJobs, user.JobsDoneCount),
            AverageRating = avgRating,
            TotalReviewsCount = reviews.Count,
            IsKycVerified = string.Equals(user.KycStatus, "verified", StringComparison.OrdinalIgnoreCase),
            ExpectedHourlyRate = user.ExpectedHourlyRate,
            GraduationYear = null,
            JoinedAt = user.JoinedAt,
            Skills = customSkills,
            Education = SafeDeserialize(user.EducationJson, new List<EducationItemDto>()),
            Experiences = SafeDeserialize(user.ExperienceJson, new List<ExperienceItemDto>()),
            SocialLinks = SafeDeserialize(user.SocialLinksJson, new SocialLinksDto()),
            Portfolios = portfolios,
            Badges = badges,
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

    public async Task<CompanyPublicProfileDto> GetPublicCompanyProfileAsync(int employerId, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users
            .Include(u => u.Role)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == employerId, cancellationToken);

        if (user == null)
        {
            throw new BusinessException("Không tìm thấy thông tin doanh nghiệp này.");
        }

        // Lấy danh sách công việc đang mở tuyển thật từ DB
        var openJobs = await _dbContext.Jobs
            .Include(j => j.Category)
            .Include(j => j.Applications)
            .Where(j => j.EmployerId == employerId && j.Status == "open")
            .OrderByDescending(j => j.PostedAt)
            .Take(15)
            .AsNoTracking()
            .Select(j => new CompanyJobItemDto
            {
                Id = j.Id,
                Title = j.Title,
                CategoryName = j.Category != null ? j.Category.Name : "Khác",
                Budget = j.Budget,
                Location = j.Location,
                IsUrgent = j.IsUrgent,
                IsFeatured = j.IsFeatured,
                DeadlineAt = j.DeadlineAt,
                PostedAt = j.PostedAt,
                ApplicationsCount = j.Applications.Count
            })
            .ToListAsync(cancellationToken);

        var totalHiredCount = await _dbContext.Jobs
            .CountAsync(j => j.EmployerId == employerId && j.HiredApplicantId != null, cancellationToken);

        var reviews = await _dbContext.Reviews
            .Include(r => r.Reviewer)
            .Include(r => r.Job)
            .Where(r => r.RevieweeId == employerId)
            .OrderByDescending(r => r.CreatedAt)
            .Take(15)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var avgRating = reviews.Count > 0
            ? Math.Round(reviews.Average(r => r.Stars), 1)
            : 5.0;

        return new CompanyPublicProfileDto
        {
            Id = user.Id,
            CompanyName = user.FullName,
            Representative = user.Representative,
            TaxCode = user.TaxCode,
            Industry = user.Industry ?? "Doanh nghiệp tuyển dụng",
            CompanySize = user.CompanySize ?? "10-50 nhân sự",
            Website = user.Website,
            Address = user.Address,
            AvatarUrl = _storageService.GetPublicUrl(user.AvatarUrl),
            CoverImageUrl = _storageService.GetPublicUrl(user.CoverImageUrl),
            CompanyDescription = user.CompanyDescription,
            Bio = user.Bio,
            Headline = user.Headline,
            KycStatus = user.KycStatus ?? "pending",
            ReliabilityScore = user.ReliabilityScore,
            OpenJobsCount = openJobs.Count,
            TotalHiredCount = Math.Max(totalHiredCount, user.JobsDoneCount),
            AverageRating = avgRating,
            TotalReviewsCount = reviews.Count,
            JoinedAt = user.JoinedAt,
            Benefits = SafeDeserialize(user.BenefitsJson, new List<string>()),
            OfficeImages = SafeDeserialize(user.OfficeImagesJson, new List<string>()),
            SocialLinks = SafeDeserialize(user.SocialLinksJson, new SocialLinksDto()),
            OpenJobs = openJobs,
            Reviews = reviews.ConvertAll(r => new UserReviewItemDto
            {
                Id = r.Id,
                ReviewerName = r.Reviewer?.FullName ?? "Ứng viên",
                ReviewerAvatarUrl = _storageService.GetPublicUrl(r.Reviewer?.AvatarUrl),
                JobTitle = r.Job?.Title ?? "Dự án hợp tác",
                Stars = r.Stars,
                Comment = r.Comment ?? string.Empty,
                CreatedAt = r.CreatedAt
            })
        };
    }

    public async Task<List<PortfolioItemDto>> GetPortfolioAsync(int userId, CancellationToken cancellationToken = default)
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

    public async Task<PortfolioItemDto> UploadPortfolioAsync(
        int userId,
        Stream stream,
        string fileName,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        if (stream == null || stream.Length == 0)
        {
            throw new BusinessException("Dữ liệu tác phẩm không hợp lệ.");
        }

        if (stream.Length > 15 * 1024 * 1024)
        {
            throw new BusinessException("Dung lượng file tác phẩm vượt quá giới hạn cho phép (tối đa 15MB).");
        }

        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp", ".pdf", ".zip", ".rar", ".mp4" };
        if (!allowedExtensions.Contains(ext))
        {
            throw new BusinessException("Định dạng file không được hỗ trợ cho Portfolio.");
        }

        FileSignatureValidator.ValidateSafeFile(stream, fileName);

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
            FileType = ext.TrimStart('.'),
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

    public async Task<List<UserBadgeItemDto>> GetUserBadgesAsync(int userId, CancellationToken cancellationToken = default)
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
            CoverImageUrl = _storageService.GetPublicUrl(user.CoverImageUrl),
            Headline = user.Headline,
            Bio = user.Bio,
            RoleCode = user.Role?.Code ?? "student",
            RoleName = user.Role?.Name ?? "student",
            School = user.School ?? user.StudentProfile?.School?.Name,
            SchoolId = user.SchoolId ?? user.StudentProfile?.SchoolId,
            StudentCode = user.StudentCode ?? user.StudentProfile?.StudentCode,
            GraduationYear = user.GraduationYear ?? user.StudentProfile?.GraduationYear,
            Industry = user.Industry,
            CompanySize = user.CompanySize,
            Website = user.Website,
            CompanyDescription = user.CompanyDescription,
            TaxCode = user.TaxCode,
            Representative = user.Representative,
            Address = user.Address,
            KycStatus = user.KycStatus ?? "pending",
            AccountStatus = user.AccountStatus ?? "active",
            ReliabilityScore = user.ReliabilityScore,
            JobsDoneCount = user.JobsDoneCount,
            ExpectedHourlyRate = user.ExpectedHourlyRate,
            ReferralCode = user.ReferralCode,
            JoinedAt = user.JoinedAt,
            HasPassword = !string.IsNullOrEmpty(user.PasswordHash) && !user.PasswordHash.StartsWith("GOOGLE_SSO:"),
            Skills = SafeDeserialize(user.SkillsJson, new List<string>()),
            Education = SafeDeserialize(user.EducationJson, new List<EducationItemDto>()),
            Experiences = SafeDeserialize(user.ExperienceJson, new List<ExperienceItemDto>()),
            SocialLinks = SafeDeserialize(user.SocialLinksJson, new SocialLinksDto()),
            Benefits = SafeDeserialize(user.BenefitsJson, new List<string>()),
            OfficeImages = SafeDeserialize(user.OfficeImagesJson, new List<string>())
        };
    }

    private static T SafeDeserialize<T>(string? json, T defaultValue)
    {
        if (string.IsNullOrWhiteSpace(json)) return defaultValue;
        try
        {
            return JsonSerializer.Deserialize<T>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? defaultValue;
        }
        catch
        {
            return defaultValue;
        }
    }

    private static string? SafeSerialize<T>(T? obj)
    {
        if (obj == null) return null;
        try
        {
            return JsonSerializer.Serialize(obj);
        }
        catch
        {
            return null;
        }
    }
}
