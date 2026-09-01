using System;
using System.Collections.Generic;
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

public class DeliverableService : IDeliverableService
{
    private readonly SkillBridgeDbContext _dbContext;
    private readonly IStorageService _storageService;
    private readonly ILogger<DeliverableService> _logger;

    public DeliverableService(
        SkillBridgeDbContext dbContext,
        IStorageService storageService,
        ILogger<DeliverableService> logger)
    {
        _dbContext = dbContext;
        _storageService = storageService;
        _logger = logger;
    }

    public async Task<List<DeliverableDto>> GetDeliverablesByJobIdAsync(
        int userId,
        int jobId,
        CancellationToken cancellationToken = default)
    {
        var job = await _dbContext.Jobs
            .AsNoTracking()
            .FirstOrDefaultAsync(j => j.Id == jobId, cancellationToken);

        if (job == null)
        {
            throw new BusinessException("Công việc không tồn tại.");
        }

        var isEmployer = job.EmployerId == userId;

        var query = _dbContext.JobDeliverables
            .Include(d => d.Student)
            .Include(d => d.DeliverableFeedbacks)
                .ThenInclude(f => f.Employer)
            .Where(d => d.JobId == jobId);

        if (!isEmployer)
        {
            // Sinh viên chỉ được xem deliverables do chính mình nộp cho job này (chặn IDOR)
            query = query.Where(d => d.StudentId == userId);
        }

        var deliverables = await query
            .OrderByDescending(d => d.Version)
            .ToListAsync(cancellationToken);

        return deliverables.Select(MapToDeliverableDto).ToList();
    }

    public async Task<DeliverableDto> SubmitDeliverableAsync(
        int studentId,
        int jobId,
        Stream? stream,
        string? fileName,
        string? contentType,
        string? externalUrl,
        string? note,
        CancellationToken cancellationToken = default)
    {
        var job = await _dbContext.Jobs.FirstOrDefaultAsync(j => j.Id == jobId, cancellationToken);
        if (job == null)
        {
            throw new BusinessException("Công việc không tồn tại.");
        }

        if (job.Status == "cancelled")
        {
            throw new BusinessException("Công việc này đã bị hủy, không thể nộp sản phẩm.");
        }

        if (job.EmployerId == studentId)
        {
            throw new BusinessException("Nhà tuyển dụng không thể nộp sản phẩm cho chính công việc của mình.");
        }

        // Kiểm tra quyền nộp deliverable:
        // Nếu đã có HiredApplicantId thì bắt buộc phải là người được tuyển dụng
        if (job.HiredApplicantId.HasValue && job.HiredApplicantId.Value != studentId)
        {
            throw new BusinessException("Bạn không phải ứng viên được tuyển dụng cho công việc này.");
        }

        // Nếu chưa set HiredApplicantId, kiểm tra sinh viên đã nộp đơn ứng tuyển cho job này chưa
        if (!job.HiredApplicantId.HasValue)
        {
            var hasApplied = await _dbContext.Applications
                .AnyAsync(a => a.JobId == jobId && a.StudentId == studentId, cancellationToken);

            if (!hasApplied)
            {
                throw new BusinessException("Bạn cần ứng tuyển công việc này trước khi nộp sản phẩm.");
            }
        }

        string previewUrl = externalUrl ?? string.Empty;
        string cleanFileName = fileName != null ? Path.GetFileName(fileName) : "external_link";
        string fileType = "url";

        if (stream != null && stream.Length > 0 && !string.IsNullOrWhiteSpace(fileName))
        {
            if (stream.Length > 25 * 1024 * 1024)
            {
                throw new BusinessException("Dung lượng file sản phẩm vượt quá giới hạn cho phép (tối đa 25MB).");
            }

            cleanFileName = Path.GetFileName(fileName);
            var fileExt = Path.GetExtension(cleanFileName).ToLowerInvariant();

            // Danh sách trắng (Whitelist) các định dạng file được phép tải lên
            var allowedExtensions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                // Tài liệu & dữ liệu
                ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv", ".json",
                // Nén & Thiết kế
                ".zip", ".rar", ".7z", ".tar", ".gz", ".png", ".jpg", ".jpeg", ".webp", ".psd", ".ai", ".fig",
                // Đa phương tiện
                ".mp4", ".mp3", ".wav"
            };

            if (!allowedExtensions.Contains(fileExt))
            {
                throw new BusinessException("Định dạng file không được hỗ trợ. Chỉ chấp nhận tài liệu (PDF, Word, Excel, PowerPoint), file nén (ZIP, RAR), hình ảnh (PNG, JPG), media hoặc file thiết kế.");
            }

            // Validate denylist safe file signature
            FileSignatureValidator.ValidateSafeFile(stream, cleanFileName);

            fileType = fileExt.TrimStart('.');

            // Tải file kết quả công việc lên Cloudflare R2
            var uploadResult = await _storageService.UploadStreamAsync(
                stream,
                cleanFileName,
                contentType ?? "application/octet-stream",
                folder: "job-deliverables",
                cancellationToken: cancellationToken);

            previewUrl = uploadResult.FileUrl;
        }
        else if (string.IsNullOrWhiteSpace(externalUrl))
        {
            throw new BusinessException("Vui lòng đính kèm file sản phẩm hoặc đường dẫn liên kết ngoài (GitHub/Figma/Drive).");
        }

        JobDeliverable? createdEntity = null;
        const int maxRetries = 3;

        for (int attempt = 1; attempt <= maxRetries; attempt++)
        {
            var currentMaxVersion = await _dbContext.JobDeliverables
                .Where(d => d.JobId == jobId)
                .MaxAsync(d => (int?)d.Version, cancellationToken) ?? 0;

            var deliverable = new JobDeliverable
            {
                JobId = jobId,
                StudentId = studentId,
                Version = currentMaxVersion + 1,
                PreviewFileUrl = previewUrl,
                FinalFileUrl = previewUrl,
                ExternalUrl = externalUrl,
                FileName = cleanFileName,
                FileType = string.IsNullOrWhiteSpace(fileType) ? "binary" : fileType,
                Note = note?.Trim(),
                Status = "submitted",
                SubmittedAt = DateTime.UtcNow
            };

            try
            {
                await _dbContext.JobDeliverables.AddAsync(deliverable, cancellationToken);
                await _dbContext.SaveChangesAsync(cancellationToken);
                createdEntity = deliverable;
                break;
            }
            catch (DbUpdateException ex) when (IsDuplicateVersionError(ex) && attempt < maxRetries)
            {
                _dbContext.Entry(deliverable).State = EntityState.Detached;
                _logger.LogWarning("Phát hiện xung đột version khi nộp deliverable cho Job {JobId}. Đang thử lại lần {Attempt}...", jobId, attempt);
                await Task.Delay(50 * attempt, cancellationToken);
            }
        }

        if (createdEntity == null)
        {
            throw new BusinessException("Không thể hoàn tất nộp sản phẩm do xung đột phiên bản. Vui lòng thử lại.");
        }

        // Load lại với quan hệ
        var created = await _dbContext.JobDeliverables
            .Include(d => d.Student)
            .Include(d => d.DeliverableFeedbacks)
                .ThenInclude(f => f.Employer)
            .FirstAsync(d => d.Id == createdEntity.Id, cancellationToken);

        _logger.LogInformation("Sinh viên {StudentId} nộp bài deliverable v{Version} cho Job {JobId}.", studentId, createdEntity.Version, jobId);
        return MapToDeliverableDto(created);
    }

    private static bool IsDuplicateVersionError(DbUpdateException ex)
    {
        return ex.InnerException is MySqlConnector.MySqlException mysqlEx 
            && mysqlEx.Number == 1062 
            && (mysqlEx.Message.Contains("uq_deliverables_job_version", StringComparison.OrdinalIgnoreCase)
                || mysqlEx.Message.Contains("JobId_Version", StringComparison.OrdinalIgnoreCase));
    }

    public async Task<DeliverableDto> ReviewDeliverableAsync(
        int employerId,
        int jobId,
        int deliverableId,
        ReviewDeliverableRequest request,
        CancellationToken cancellationToken = default)
    {
        var job = await _dbContext.Jobs.FirstOrDefaultAsync(j => j.Id == jobId, cancellationToken);
        if (job == null || job.EmployerId != employerId)
        {
            throw new BusinessException("Bạn không có quyền đánh giá sản phẩm của công việc này.");
        }

        var deliverable = await _dbContext.JobDeliverables
            .Include(d => d.Student)
            .Include(d => d.DeliverableFeedbacks)
                .ThenInclude(f => f.Employer)
            .FirstOrDefaultAsync(d => d.Id == deliverableId && d.JobId == jobId, cancellationToken);

        if (deliverable == null)
        {
            throw new BusinessException("Bản nộp sản phẩm không tồn tại.");
        }

        var normalizedStatus = request.Status.ToLowerInvariant().Trim();
        if (normalizedStatus != "accepted" && normalizedStatus != "revision_requested")
        {
            throw new BusinessException("Trạng thái đánh giá không hợp lệ (chỉ chấp nhận 'accepted' hoặc 'revision_requested').");
        }

        if (normalizedStatus == "revision_requested")
        {
            if (job.RevisionCount >= job.RevisionLimit)
            {
                throw new BusinessException($"Công việc này đã đạt giới hạn chỉnh sửa tối đa ({job.RevisionLimit} lần).");
            }
            job.RevisionCount += 1;
        }

        deliverable.Status = normalizedStatus;
        deliverable.ReviewedAt = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(request.FeedbackComment))
        {
            var feedback = new DeliverableFeedback
            {
                DeliverableId = deliverable.Id,
                EmployerId = employerId,
                FeedbackText = request.FeedbackComment.Trim(),
                CreatedAt = DateTime.UtcNow
            };
            await _dbContext.DeliverableFeedbacks.AddAsync(feedback, cancellationToken);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Nhà tuyển dụng {EmployerId} đã duyệt deliverable {DeliverableId} với trạng thái {Status}.", employerId, deliverableId, normalizedStatus);
        return MapToDeliverableDto(deliverable);
    }

    private static DeliverableDto MapToDeliverableDto(JobDeliverable d)
    {
        return new DeliverableDto
        {
            Id = d.Id,
            JobId = d.JobId,
            StudentId = d.StudentId,
            StudentName = d.Student?.FullName ?? "Sinh viên",
            Version = d.Version,
            PreviewFileUrl = d.PreviewFileUrl,
            FinalFileUrl = d.FinalFileUrl,
            ExternalUrl = d.ExternalUrl,
            FileName = d.FileName,
            FileType = d.FileType,
            Note = d.Note,
            Status = d.Status,
            SubmittedAt = d.SubmittedAt,
            ReviewedAt = d.ReviewedAt,
            Feedbacks = d.DeliverableFeedbacks.Select(f => new DeliverableFeedbackDto
            {
                Id = f.Id,
                AuthorId = f.EmployerId,
                AuthorName = f.Employer?.FullName ?? "Nhà tuyển dụng",
                Content = f.FeedbackText,
                CreatedAt = f.CreatedAt
            }).ToList()
        };
    }
}
