using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Applications;
using SkillBridge.Application.Interfaces.Applications;
using SkillBridge.Application.Interfaces.Storage;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Repositories.Interfaces;

namespace SkillBridge.Infrastructure.Services.Applications;

public class CvService : ICvService
{
    private readonly ICvFileRepository _cvFileRepository;
    private readonly ICategoryRepository _categoryRepository;
    private readonly IStorageService _storageService;
    private readonly SkillBridge.Infrastructure.Data.SkillBridgeDbContext _context;

    public CvService(
        ICvFileRepository cvFileRepository,
        ICategoryRepository categoryRepository,
        IStorageService storageService,
        SkillBridge.Infrastructure.Data.SkillBridgeDbContext context)
    {
        _cvFileRepository = cvFileRepository;
        _categoryRepository = categoryRepository;
        _storageService = storageService;
        _context = context;
    }

    public async Task<List<CvFileDto>> GetStudentCvFilesAsync(int studentId)
    {
        var list = await _cvFileRepository.GetByStudentIdAsync(studentId);
        return list.Select(c => new CvFileDto
        {
            Id = c.Id,
            StudentId = c.StudentId,
            FileName = c.FileName,
            FileUrl = _storageService.GetPublicUrl(c.FileUrl),
            FileSize = c.FileSize,
            Label = c.Label,
            CategoryId = c.CategoryId,
            CategoryName = c.Category?.Name,
            IsSearchable = c.IsSearchable ?? true,
            UploadedAt = c.UploadedAt
        }).ToList();
    }

    public async Task<CvFileDto> UploadCvAsync(int studentId, UploadCvRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FileName))
        {
            throw new BusinessException("Tên file không được để trống.");
        }

        var cleanFileName = Path.GetFileName(request.FileName.Trim());
        var ext = Path.GetExtension(cleanFileName).ToLowerInvariant();
        var allowedExtensions = new[] { ".pdf", ".doc", ".docx" };
        if (!allowedExtensions.Contains(ext))
        {
            throw new BusinessException("Định dạng file không hợp lệ. Chỉ chấp nhận các định dạng tài liệu .pdf, .doc, .docx.");
        }

        if (request.FileSize <= 0 || request.FileSize > 10 * 1024 * 1024)
        {
            throw new BusinessException("Dung lượng file CV không hợp lệ hoặc vượt quá giới hạn cho phép (tối đa 10MB).");
        }

        string fileUrl;
        if (!string.IsNullOrWhiteSpace(request.FileUrl))
        {
            var trimmedUrl = request.FileUrl.Trim();
            // Validate URL an toàn: chấp nhận relative /uploads/ hoặc absolute URL với host được whitelist
            if (trimmedUrl.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase) ||
                (Uri.TryCreate(trimmedUrl, UriKind.Absolute, out var parsedUri) &&
                 (parsedUri.Scheme == Uri.UriSchemeHttps || (parsedUri.Scheme == Uri.UriSchemeHttp && parsedUri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase))) &&
                 IsAllowedStorageHost(parsedUri.Host)))
            {
                fileUrl = trimmedUrl;
            }
            else
            {
                throw new BusinessException("Đường dẫn file CV không hợp lệ hoặc không thuộc hệ thống lưu trữ được tin cậy.");
            }
        }
        else
        {
            fileUrl = $"/uploads/cv/{Guid.NewGuid()}_{cleanFileName}";
        }

        string? categoryName = null;
        if (request.CategoryId.HasValue)
        {
            var cat = await _categoryRepository.GetByIdAsync(request.CategoryId.Value);
            if (cat == null)
            {
                throw new BusinessException("Danh mục nghề nghiệp không tồn tại.");
            }
            categoryName = cat.Name;
        }

        var entity = new CvFile
        {
            StudentId = studentId,
            FileName = cleanFileName,
            FileUrl = fileUrl,
            PublicId = Guid.NewGuid().ToString("N"),
            FileSize = request.FileSize,
            Label = string.IsNullOrWhiteSpace(request.Label) ? cleanFileName : request.Label.Trim(),
            CategoryId = request.CategoryId,
            IsSearchable = request.IsSearchable,
            UploadedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _cvFileRepository.AddAsync(entity);
        return MapToDto(entity, categoryName);
    }

    public async Task<CvFileDto> UploadCvBinaryAsync(
        int studentId,
        Stream stream,
        string fileName,
        string contentType,
        string? label,
        int? categoryId)
    {
        if (stream == null || stream.Length == 0)
        {
            throw new BusinessException("Dữ liệu file không hợp lệ hoặc rỗng.");
        }

        if (stream.Length > 10 * 1024 * 1024)
        {
            throw new BusinessException("Dung lượng file CV vượt quá giới hạn cho phép (tối đa 10MB).");
        }

        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        var allowedExtensions = new[] { ".pdf", ".doc", ".docx" };
        if (!allowedExtensions.Contains(ext))
        {
            throw new BusinessException("Định dạng file không hợp lệ. Chỉ chấp nhận các định dạng tài liệu .pdf, .doc, .docx.");
        }

        // Validate denylist safe file signature
        FileSignatureValidator.ValidateSafeFile(stream, fileName);

        string? categoryName = null;
        if (categoryId.HasValue)
        {
            var cat = await _categoryRepository.GetByIdAsync(categoryId.Value);
            if (cat == null)
            {
                throw new BusinessException("Danh mục nghề nghiệp không tồn tại.");
            }
            categoryName = cat.Name;
        }

        // Tải file trực tiếp lên Cloudflare R2
        var uploadResult = await _storageService.UploadStreamAsync(
            stream,
            fileName,
            contentType,
            folder: "cvs");

        var cleanName = Path.GetFileName(fileName);
        var entity = new CvFile
        {
            StudentId = studentId,
            FileName = cleanName,
            FileUrl = uploadResult.FileKey,
            PublicId = uploadResult.FileKey,
            FileSize = (int)uploadResult.FileSize,
            Label = string.IsNullOrWhiteSpace(label) ? cleanName : label.Trim(),
            CategoryId = categoryId,
            IsSearchable = true,
            UploadedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _cvFileRepository.AddAsync(entity);
        return MapToDto(entity, categoryName);
    }

    public async Task DeleteCvAsync(int studentId, int cvId)
    {
        var cv = await _cvFileRepository.GetByIdAsync(cvId);
        if (cv == null || cv.StudentId != studentId)
        {
            throw new BusinessException("CV không tồn tại hoặc bạn không có quyền xóa.");
        }

        // Xóa file trên Cloudflare R2 nếu có publicId (fileKey)
        if (!string.IsNullOrWhiteSpace(cv.PublicId))
        {
            await _storageService.DeleteFileAsync(cv.PublicId);
        }

        await _cvFileRepository.DeleteAsync(cv);
    }

    public async Task<(Stream Stream, string ContentType, string FileName)> GetCvFileStreamAsync(int currentUserId, int cvId)
    {
        var cv = await _cvFileRepository.GetByIdAsync(cvId);
        if (cv == null)
        {
            throw new BusinessException("Không tìm thấy file CV.");
        }

        // Quyền truy cập: Sinh viên sở hữu CV HOẶC Nhà tuyển dụng nhận được đơn ứng tuyển chứa CV này
        if (cv.StudentId != currentUserId)
        {
            var isEmployerWithAccess = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.AnyAsync(
                _context.Applications.Where(a => a.CvFileId == cvId && a.Job.EmployerId == currentUserId)
            );

            if (!isEmployerWithAccess)
            {
                throw new BusinessException("Bạn không có quyền truy cập file CV này.");
            }
        }

        var fileKey = !string.IsNullOrWhiteSpace(cv.PublicId)
            ? cv.PublicId
            : ExtractFileKeyFromUrl(cv.FileUrl);

        if (string.IsNullOrWhiteSpace(fileKey))
        {
            throw new BusinessException("Không xác định được vị trí file trên hệ thống lưu trữ.");
        }

        var downloadResult = await _storageService.DownloadFileAsync(fileKey);
        if (downloadResult == null)
        {
            throw new BusinessException("Không thể tải file CV từ hệ thống lưu trữ.");
        }

        var ext = Path.GetExtension(cv.FileName).ToLowerInvariant();
        var contentType = ext switch
        {
            ".pdf" => "application/pdf",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".doc" => "application/msword",
            _ => "application/octet-stream"
        };

        return (downloadResult.Value.Stream, contentType, cv.FileName);
    }

    private static string? ExtractFileKeyFromUrl(string? fileUrl)
    {
        if (string.IsNullOrWhiteSpace(fileUrl)) return null;

        if (Uri.TryCreate(fileUrl, UriKind.Absolute, out var uri))
        {
            var path = Uri.UnescapeDataString(uri.AbsolutePath).TrimStart('/');
            var cvsIdx = path.IndexOf("cvs/", StringComparison.OrdinalIgnoreCase);
            if (cvsIdx >= 0)
            {
                return path.Substring(cvsIdx);
            }
            return path;
        }

        return fileUrl;
    }

    private CvFileDto MapToDto(CvFile entity, string? categoryName)
    {
        return new CvFileDto
        {
            Id = entity.Id,
            StudentId = entity.StudentId,
            FileName = entity.FileName,
            FileUrl = _storageService.GetPublicUrl(entity.FileUrl),
            FileSize = entity.FileSize,
            Label = entity.Label,
            CategoryId = entity.CategoryId,
            CategoryName = categoryName ?? entity.Category?.Name,
            IsSearchable = entity.IsSearchable ?? true,
            UploadedAt = entity.UploadedAt
        };
    }

    private static bool IsAllowedStorageHost(string host)
    {
        return host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
               host.Equals("r2.dev", StringComparison.OrdinalIgnoreCase) ||
               host.EndsWith(".r2.dev", StringComparison.OrdinalIgnoreCase) ||
               host.Equals("cloudflarestorage.com", StringComparison.OrdinalIgnoreCase) ||
               host.EndsWith(".cloudflarestorage.com", StringComparison.OrdinalIgnoreCase);
    }
}
