using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Users;
using SkillBridge.Application.Interfaces.Storage;
using SkillBridge.Application.Interfaces.Users;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Services.Users;

public class KycService : IKycService
{
    private readonly SkillBridgeDbContext _context;
    private readonly IStorageService _storageService;
    private readonly ILogger<KycService> _logger;

    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "application/pdf"
    };

    public KycService(
        SkillBridgeDbContext context,
        IStorageService storageService,
        ILogger<KycService> logger)
    {
        _context = context;
        _storageService = storageService;
        _logger = logger;
    }

    public async Task<KycStatusResponse> GetKycStatusAsync(int userId, CancellationToken ct = default)
    {
        var user = await _context.Users
            .Include(u => u.IdentityDocuments)
            .FirstOrDefaultAsync(u => u.Id == userId, ct);

        if (user == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy người dùng có ID {userId}.");
        }

        var docs = user.IdentityDocuments
            .OrderByDescending(d => d.UploadedAt)
            .Select(d => new KycDocumentDto
            {
                Id = d.Id,
                DocType = d.DocType,
                FileName = d.FileName,
                FileUrl = _storageService.GetPublicUrl(d.FileUrl),
                FileType = d.FileType,
                FileSize = d.FileSize,
                UploadedAt = d.UploadedAt
            }).ToList();

        // Trích xuất metadata từ trường School hoặc CompanyDescription
        var (extractedSchool, extractedMssv, extractedGradYear) = ParseStudentMetadata(user.School);

        // Tính ngày hết hạn thẻ sinh viên (hết năm học 31/12 của năm tốt nghiệp)
        DateTime? kycExpiresAt = null;
        if (extractedGradYear.HasValue)
        {
            kycExpiresAt = new DateTime(extractedGradYear.Value, 12, 31, 23, 59, 59, DateTimeKind.Utc);
        }

        // Đánh giá trạng thái thực tế
        string resolvedStatus;
        if (docs.Count == 0)
        {
            resolvedStatus = "unverified";
        }
        else if (user.KycStatus == "rejected")
        {
            resolvedStatus = "rejected";
        }
        else if (user.KycStatus == "verified")
        {
            if (kycExpiresAt.HasValue && DateTime.UtcNow > kycExpiresAt.Value)
            {
                resolvedStatus = "expired";
            }
            else
            {
                resolvedStatus = "verified";
            }
        }
        else
        {
            resolvedStatus = "pending";
        }

        return new KycStatusResponse
        {
            KycStatus = resolvedStatus,
            KycRejectionReason = user.KycRejectionReason,
            KycReviewedAt = user.KycReviewedAt,
            School = extractedSchool ?? user.School,
            StudentIdNumber = extractedMssv,
            GraduationYear = extractedGradYear,
            KycExpiresAt = kycExpiresAt,
            CompanyName = user.FullName,
            ReliabilityScore = user.ReliabilityScore,
            Documents = docs
        };
    }

    public async Task<KycStatusResponse> SubmitKycAsync(
        int userId,
        SubmitKycRequest request,
        List<KycFileUploadModel> files,
        CancellationToken ct = default)
    {
        if (files == null || files.Count == 0)
        {
            throw new BusinessException("Vui lòng tải lên ít nhất một ảnh/tệp giấy tờ chứng minh hợp lệ.");
        }

        if (files.Count > 3)
        {
            throw new BusinessException("Chỉ được phép tải lên tối đa 3 tệp tài liệu trong một lần xác minh.");
        }

        var user = await _context.Users
            .Include(u => u.IdentityDocuments)
            .FirstOrDefaultAsync(u => u.Id == userId, ct);

        if (user == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy người dùng có ID {userId}.");
        }

        // Kiểm tra xem hiện tại có đang pending hoặc verified chưa hết hạn không
        var currentStatus = await GetKycStatusAsync(userId, ct);
        if (currentStatus.KycStatus == "pending")
        {
            throw new BusinessException("Hồ sơ xác minh danh tính của bạn đang được chuyên viên thẩm định. Vui lòng không nộp lại.");
        }
        if (currentStatus.KycStatus == "verified")
        {
            throw new BusinessException("Tài khoản của bạn đã được xác minh thành công. Thẻ sinh viên vẫn còn trong thời hạn hiệu lực.");
        }

        // Validate nghiệp vụ theo loại tài liệu
        string docTypeEnum = request.DocumentType?.ToLowerInvariant() switch
        {
            "business_license" => "business_license",
            "identity_card" => "identity_card",
            "passport" => "passport",
            _ => "student_card"
        };

        if (docTypeEnum == "student_card")
        {
            if (string.IsNullOrWhiteSpace(request.School))
            {
                throw new BusinessException("Vui lòng cung cấp tên trường Đại học / Cao đẳng bạn đang theo học.");
            }

            if (string.IsNullOrWhiteSpace(request.StudentIdNumber))
            {
                throw new BusinessException("Vui lòng cung cấp Mã số sinh viên (MSSV) in trên thẻ sinh viên.");
            }

            var currentYear = DateTime.UtcNow.Year;
            if (!request.GraduationYear.HasValue || request.GraduationYear.Value < currentYear)
            {
                throw new BusinessException($"Năm tốt nghiệp dự kiến không hợp lệ. Vui lòng chọn năm hiện tại hoặc tương lai (từ {currentYear} trở đi).");
            }

            if (request.GraduationYear.Value > currentYear + 7)
            {
                throw new BusinessException("Năm tốt nghiệp dự kiến không được vượt quá 7 năm so với thời điểm hiện tại.");
            }

            // Chuẩn hóa lưu trữ School kèm MSSV và năm tốt nghiệp
            user.School = $"{request.School.Trim()} | MSSV: {request.StudentIdNumber.Trim().ToUpperInvariant()} | Grad: {request.GraduationYear.Value}";
        }
        else
        {
            if (!string.IsNullOrWhiteSpace(request.CompanyName))
            {
                user.CompanyDescription = $"Doanh nghiệp: {request.CompanyName.Trim()}" +
                    (!string.IsNullOrWhiteSpace(request.TaxCode) ? $" - MST: {request.TaxCode.Trim()}" : "");
            }
        }

        // Validate tệp và upload lên Cloudflare R2
        var uploadedDocs = new List<IdentityDocument>();

        foreach (var file in files)
        {
            if (file.Length <= 0 || file.Length > 10 * 1024 * 1024)
            {
                throw new BusinessException($"Tệp {file.FileName} không hợp lệ hoặc vượt quá kích thước 10MB cho phép.");
            }

            if (!AllowedContentTypes.Contains(file.ContentType))
            {
                throw new BusinessException($"Định dạng tệp {file.FileName} ({file.ContentType}) không được hỗ trợ. Chỉ chấp nhận JPG, PNG, WEBP hoặc PDF.");
            }

            var folderPath = $"kyc/documents/{userId}";
            var uploadResult = await _storageService.UploadStreamAsync(
                file.FileStream,
                file.FileName,
                file.ContentType,
                folderPath,
                ct);

            var doc = new IdentityDocument
            {
                UserId = userId,
                DocType = docTypeEnum,
                FileName = file.FileName,
                FileUrl = uploadResult.FileUrl,
                PublicId = uploadResult.FileKey,
                FileType = file.ContentType,
                FileSize = (int)file.Length,
                UploadedAt = DateTime.UtcNow
            };

            uploadedDocs.Add(doc);
        }

        // Lưu vào DB
        _context.IdentityDocuments.AddRange(uploadedDocs);
        user.KycStatus = "pending";
        user.KycRejectionReason = null;
        user.KycReviewedAt = null;
        user.KycReviewedBy = null;

        await _context.SaveChangesAsync(ct);
        _logger.LogInformation("Người dùng {UserId} vừa nộp {Count} tệp eKYC ({DocType}).", userId, uploadedDocs.Count, docTypeEnum);

        return await GetKycStatusAsync(userId, ct);
    }

    private static (string? School, string? Mssv, int? GradYear) ParseStudentMetadata(string? rawSchool)
    {
        if (string.IsNullOrWhiteSpace(rawSchool))
        {
            return (null, null, null);
        }

        // Format: "{School} | MSSV: {Mssv} | Grad: {GradYear}"
        var match = Regex.Match(rawSchool, @"^(.*?)(?:\s*\|\s*MSSV:\s*([A-Za-z0-9_-]+))?(?:\s*\|\s*Grad:\s*(\d{4}))?$", RegexOptions.IgnoreCase);
        if (match.Success)
        {
            var school = match.Groups[1].Value.Trim();
            var mssv = match.Groups[2].Success ? match.Groups[2].Value.Trim() : null;
            int? gradYear = null;
            if (match.Groups[3].Success && int.TryParse(match.Groups[3].Value, out int year))
            {
                gradYear = year;
            }

            return (string.IsNullOrEmpty(school) ? null : school, mssv, gradYear);
        }

        return (rawSchool.Trim(), null, null);
    }
}
