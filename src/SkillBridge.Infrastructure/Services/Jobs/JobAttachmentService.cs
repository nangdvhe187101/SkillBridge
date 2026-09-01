using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Jobs;
using SkillBridge.Application.Interfaces.Jobs;
using SkillBridge.Application.Interfaces.Storage;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Services.Jobs;

public class JobAttachmentService : IJobAttachmentService
{
    private readonly SkillBridgeDbContext _dbContext;
    private readonly IStorageService _storageService;
    private readonly ILogger<JobAttachmentService> _logger;

    private static readonly string[] AllowedExtensions =
    {
        ".pdf", ".doc", ".docx", ".txt", ".rtf",
        ".png", ".jpg", ".jpeg", ".webp",
        ".zip", ".rar", ".7z",
        ".fig", ".psd", ".ai"
    };

    public JobAttachmentService(
        SkillBridgeDbContext dbContext,
        IStorageService storageService,
        ILogger<JobAttachmentService> logger)
    {
        _dbContext = dbContext;
        _storageService = storageService;
        _logger = logger;
    }

    public async Task<JobAttachmentDto> UploadJobAttachmentAsync(
        int employerId,
        int jobId,
        Stream stream,
        string fileName,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        var job = await _dbContext.Jobs
            .FirstOrDefaultAsync(j => j.Id == jobId, cancellationToken);

        if (job == null)
        {
            throw new BusinessException("Công việc không tồn tại.");
        }

        if (job.EmployerId != employerId)
        {
            throw new BusinessException("Bạn không có quyền đính kèm tài liệu vào công việc này.");
        }

        if (stream == null || stream.Length == 0)
        {
            throw new BusinessException("Dữ liệu file đính kèm không hợp lệ hoặc rỗng.");
        }

        if (stream.Length > 25 * 1024 * 1024)
        {
            throw new BusinessException("Dung lượng file đính kèm vượt quá giới hạn cho phép (tối đa 25MB).");
        }

        var cleanFileName = Path.GetFileName(fileName?.Trim() ?? "attachment");
        var ext = Path.GetExtension(cleanFileName).ToLowerInvariant();

        if (!AllowedExtensions.Contains(ext))
        {
            throw new BusinessException($"Định dạng file {ext} không được hỗ trợ.");
        }

        // Validate denylist magic bytes
        FileSignatureValidator.ValidateSafeFile(stream, cleanFileName);

        var folder = $"jobs/{jobId}/attachments";
        var uploadResult = await _storageService.UploadStreamAsync(
            stream,
            cleanFileName,
            contentType,
            folder: folder,
            cancellationToken: cancellationToken);

        var attachment = new JobAttachment
        {
            JobId = jobId,
            FileName = cleanFileName,
            FileUrl = uploadResult.FileUrl,
            FileSize = uploadResult.FileSize,
            FileType = uploadResult.ContentType,
            CreatedAt = DateTime.UtcNow
        };

        await _dbContext.JobAttachments.AddAsync(attachment, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Nhà tuyển dụng {EmployerId} đã tải lên tài liệu {FileName} cho Job {JobId}.", employerId, cleanFileName, jobId);

        return new JobAttachmentDto
        {
            Id = attachment.Id,
            JobId = attachment.JobId,
            FileName = attachment.FileName,
            FileUrl = attachment.FileUrl,
            FileSize = attachment.FileSize,
            FileType = attachment.FileType,
            CreatedAt = attachment.CreatedAt
        };
    }

    public async Task DeleteJobAttachmentAsync(
        int employerId,
        int jobId,
        int attachmentId,
        CancellationToken cancellationToken = default)
    {
        var job = await _dbContext.Jobs
            .FirstOrDefaultAsync(j => j.Id == jobId, cancellationToken);

        if (job == null || job.EmployerId != employerId)
        {
            throw new BusinessException("Bạn không có quyền xóa tài liệu của công việc này.");
        }

        var attachment = await _dbContext.JobAttachments
            .FirstOrDefaultAsync(a => a.Id == attachmentId && a.JobId == jobId, cancellationToken);

        if (attachment == null)
        {
            throw new BusinessException("Tài liệu đính kèm không tồn tại.");
        }

        // Xóa file vật lý trên Cloudflare R2
        var fileKey = ExtractFileKeyFromUrl(attachment.FileUrl);
        if (!string.IsNullOrWhiteSpace(fileKey))
        {
            try
            {
                await _storageService.DeleteFileAsync(fileKey, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Không thể xóa file {FileKey} trên Cloudflare R2 khi xóa JobAttachment {AttachmentId}.", fileKey, attachmentId);
            }
        }

        _dbContext.JobAttachments.Remove(attachment);
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Nhà tuyển dụng {EmployerId} đã xóa tài liệu đính kèm {AttachmentId} khỏi Job {JobId}.", employerId, attachmentId, jobId);
    }

    public async Task<(Stream Stream, string ContentType, string FileName)?> GetAttachmentFileStreamAsync(
        int jobId,
        int attachmentId,
        CancellationToken cancellationToken = default)
    {
        var attachment = await _dbContext.JobAttachments
            .FirstOrDefaultAsync(a => a.Id == attachmentId && a.JobId == jobId, cancellationToken);

        if (attachment == null) return null;

        var fileKey = ExtractFileKeyFromUrl(attachment.FileUrl);
        if (string.IsNullOrWhiteSpace(fileKey)) return null;

        var downloadResult = await _storageService.DownloadFileAsync(fileKey, cancellationToken);
        if (downloadResult == null) return null;

        return (downloadResult.Value.Stream, attachment.FileType ?? downloadResult.Value.ContentType, attachment.FileName);
    }

    private static string? ExtractFileKeyFromUrl(string? fileUrl)
    {
        if (string.IsNullOrWhiteSpace(fileUrl)) return null;

        if (Uri.TryCreate(fileUrl, UriKind.Absolute, out var uri))
        {
            var path = Uri.UnescapeDataString(uri.AbsolutePath).TrimStart('/');
            var jobsIdx = path.IndexOf("jobs/", StringComparison.OrdinalIgnoreCase);
            if (jobsIdx >= 0)
            {
                return path.Substring(jobsIdx);
            }
            return path;
        }

        return fileUrl;
    }
}
