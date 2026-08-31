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

    public CvService(
        ICvFileRepository cvFileRepository,
        ICategoryRepository categoryRepository,
        IStorageService storageService)
    {
        _cvFileRepository = cvFileRepository;
        _categoryRepository = categoryRepository;
        _storageService = storageService;
    }

    public async Task<List<CvFileDto>> GetStudentCvFilesAsync(int studentId)
    {
        var list = await _cvFileRepository.GetByStudentIdAsync(studentId);
        return list.Select(c => new CvFileDto
        {
            Id = c.Id,
            StudentId = c.StudentId,
            FileName = c.FileName,
            FileUrl = c.FileUrl,
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
            FileName = request.FileName.Trim(),
            FileUrl = request.FileUrl ?? $"/uploads/cv/{Guid.NewGuid()}_{request.FileName.Trim()}",
            PublicId = Guid.NewGuid().ToString("N"),
            FileSize = request.FileSize > 0 ? request.FileSize : 1024 * 100, // fallback
            Label = string.IsNullOrWhiteSpace(request.Label) ? request.FileName.Trim() : request.Label.Trim(),
            CategoryId = request.CategoryId,
            IsSearchable = request.IsSearchable,
            UploadedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _cvFileRepository.AddAsync(entity);

        return new CvFileDto
        {
            Id = entity.Id,
            StudentId = entity.StudentId,
            FileName = entity.FileName,
            FileUrl = entity.FileUrl,
            FileSize = entity.FileSize,
            Label = entity.Label,
            CategoryId = entity.CategoryId,
            CategoryName = categoryName,
            IsSearchable = entity.IsSearchable ?? true,
            UploadedAt = entity.UploadedAt
        };
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
            FileUrl = uploadResult.FileUrl,
            PublicId = uploadResult.FileKey,
            FileSize = (int)uploadResult.FileSize,
            Label = string.IsNullOrWhiteSpace(label) ? cleanName : label.Trim(),
            CategoryId = categoryId,
            IsSearchable = true,
            UploadedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _cvFileRepository.AddAsync(entity);

        return new CvFileDto
        {
            Id = entity.Id,
            StudentId = entity.StudentId,
            FileName = entity.FileName,
            FileUrl = entity.FileUrl,
            FileSize = entity.FileSize,
            Label = entity.Label,
            CategoryId = entity.CategoryId,
            CategoryName = categoryName,
            IsSearchable = entity.IsSearchable ?? true,
            UploadedAt = entity.UploadedAt
        };
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
}
