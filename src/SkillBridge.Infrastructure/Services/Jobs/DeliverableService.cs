using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkiaSharp;
using PdfSharpCore.Pdf;
using PdfSharpCore.Pdf.IO;
using PdfSharpCore.Drawing;
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

    private static readonly HashSet<string> ImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".png", ".jpg", ".jpeg", ".webp"
    };

    private static readonly HashSet<string> VideoExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".mp4", ".mov", ".m4v", ".webm", ".avi", ".mkv", ".wmv", ".flv"
    };

    private static readonly HashSet<string> DocumentExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".docx", ".doc", ".xlsx", ".xls", ".csv", ".txt", ".json", ".xml", ".md", ".rtf", ".js", ".ts", ".py", ".java", ".cpp", ".html", ".css", ".pptx", ".ppt"
    };

    private static bool IsVideoFile(string? fileName, string? fileType)
    {
        if (!string.IsNullOrEmpty(fileName) && VideoExtensions.Contains(Path.GetExtension(fileName)))
            return true;
        return !string.IsNullOrEmpty(fileType) && fileType.Contains("video", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsDocumentFile(string? fileName, string? fileType)
    {
        if (!string.IsNullOrEmpty(fileName) && DocumentExtensions.Contains(Path.GetExtension(fileName)))
            return true;
        if (string.IsNullOrEmpty(fileType))
            return false;
        return fileType.Contains("word", StringComparison.OrdinalIgnoreCase)
            || fileType.Contains("sheet", StringComparison.OrdinalIgnoreCase)
            || fileType.Contains("excel", StringComparison.OrdinalIgnoreCase)
            || fileType.Contains("document", StringComparison.OrdinalIgnoreCase)
            || fileType.StartsWith("text/", StringComparison.OrdinalIgnoreCase);
    }

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
            .Where(d => d.JobId == jobId && d.Status != "cancelled");

        if (!isEmployer)
        {
            // Sinh viên chỉ được xem deliverables do chính mình nộp cho job này (chặn IDOR)
            query = query.Where(d => d.StudentId == userId);
        }
        else if (job.HiredApplicantId.HasValue)
        {
            // Nhà tuyển dụng chỉ xem các bản bàn giao của ứng viên đang được thuê hiện tại (tránh lẫn với sinh viên cũ đã hủy việc)
            query = query.Where(d => d.StudentId == job.HiredApplicantId.Value);
        }

        var deliverables = await query
            .OrderByDescending(d => d.Version)
            .ToListAsync(cancellationToken);

        return deliverables.Select(d => MapToDeliverableDto(d, isEmployer)).ToList();
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

        if (job.Status == "completed")
        {
            throw new BusinessException("Công việc này đã hoàn thành và nghiệm thu xong.");
        }

        if (job.EmployerId == studentId)
        {
            throw new BusinessException("Nhà tuyển dụng không thể nộp sản phẩm cho chính công việc của mình.");
        }

        // Bắt buộc công việc phải đang trong giai đoạn thực hiện, đã nộp hoặc yêu cầu sửa đổi
        if (job.Status != "in_progress" && job.Status != "revision_requested" && job.Status != "submitted")
        {
            throw new BusinessException("Công việc chưa được xác nhận thuê ứng viên hoặc hiện không ở trạng thái nhận sản phẩm bàn giao.");
        }

        // Bắt buộc sinh viên nộp phải là người được nhà tuyển dụng thuê chính thức
        if (!job.HiredApplicantId.HasValue || job.HiredApplicantId.Value != studentId)
        {
            throw new BusinessException("Chỉ ứng viên được nhà tuyển dụng chọn thuê chính thức mới có quyền nộp sản phẩm bàn giao cho công việc này.");
        }

        string? previewUrl = null;
        string? finalUrl = null;
        string cleanFileName = fileName != null ? Path.GetFileName(fileName) : "external_link";
        string fileType = "url";

        if (!string.IsNullOrWhiteSpace(externalUrl))
        {
            previewUrl = externalUrl;
            finalUrl = externalUrl;
        }

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
                ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv", ".json", ".xml", ".rtf",
                // Nén & Thiết kế
                ".zip", ".rar", ".7z", ".tar", ".gz", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".psd", ".ai", ".fig", ".xd", ".sketch", ".eps",
                // Video đa phương tiện
                ".mp4", ".mov", ".m4v", ".webm", ".avi", ".mkv", ".wmv", ".flv",
                // Âm thanh
                ".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg"
            };

            if (!allowedExtensions.Contains(fileExt))
            {
                throw new BusinessException("Định dạng file không được hỗ trợ. Chỉ chấp nhận tài liệu (PDF, Word, Excel, PowerPoint), file nén (ZIP, RAR), video (MP4, MOV, AVI), âm thanh (MP3, WAV), hình ảnh hoặc file thiết kế.");
            }

            // Đọc toàn bộ nội dung file vào byte array để có thể tái sử dụng cho nhiều luồng (validate, upload final, sinh watermark)
            using var fileMemoryStream = new MemoryStream();
            await stream.CopyToAsync(fileMemoryStream, cancellationToken);
            var fileBytes = fileMemoryStream.ToArray();

            // Validate denylist safe file signature
            using (var validateStream = new MemoryStream(fileBytes))
            {
                FileSignatureValidator.ValidateSafeFile(validateStream, cleanFileName);
            }

            fileType = fileExt.TrimStart('.');

            // 1. Tải bản gốc (Final Clean File) lên hệ thống lưu trữ
            var finalFileName = $"final_{Guid.NewGuid():N}_{cleanFileName}";
            using (var finalStream = new MemoryStream(fileBytes))
            {
                var uploadFinalResult = await _storageService.UploadStreamAsync(
                    finalStream,
                    finalFileName,
                    contentType ?? "application/octet-stream",
                    folder: $"job-deliverables/{jobId}",
                    cancellationToken: cancellationToken);

                finalUrl = uploadFinalResult.FileKey;
            }

            // 2. Tạo bản Preview có Watermark (Hỗ trợ Ảnh và PDF server-side)
            var isImage = ImageExtensions.Contains(fileExt);
            var isPdf = string.Equals(fileExt, ".pdf", StringComparison.OrdinalIgnoreCase);

            if (isImage)
            {
                using var imageStream = new MemoryStream(fileBytes);
                using var watermarkedStream = ApplyImageWatermark(imageStream, fileExt, jobId);
                if (watermarkedStream != null)
                {
                    var previewFileName = $"preview_{Guid.NewGuid():N}_{cleanFileName}";
                    var uploadPreviewResult = await _storageService.UploadStreamAsync(
                        watermarkedStream,
                        previewFileName,
                        contentType ?? "image/jpeg",
                        folder: $"job-deliverables/{jobId}",
                        cancellationToken: cancellationToken);

                    previewUrl = uploadPreviewResult.FileKey;
                }
            }
            else if (isPdf)
            {
                using var pdfStream = new MemoryStream(fileBytes);
                using var watermarkedPdfStream = ApplyPdfWatermark(pdfStream, jobId);
                if (watermarkedPdfStream != null)
                {
                    var previewFileName = $"preview_{Guid.NewGuid():N}_{cleanFileName}";
                    var uploadPreviewResult = await _storageService.UploadStreamAsync(
                        watermarkedPdfStream,
                        previewFileName,
                        "application/pdf",
                        folder: $"job-deliverables/{jobId}",
                        cancellationToken: cancellationToken);

                    previewUrl = uploadPreviewResult.FileKey;
                }
            }

            // ⚠️ TUYỆT ĐỐI KHÔNG gán previewUrl = finalUrl cho các file chưa có watermark (DOCX, XLSX, MP4, ZIP, Code...).
            // Nếu hệ thống chưa hỗ trợ tạo watermark server-side cho định dạng đó, previewUrl giữ nguyên null
            // để bảo vệ quyền tác giả, tránh rò rỉ file gốc sạch khi gọi endpoint download với type=preview.
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
                FinalFileUrl = finalUrl,
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
                
                // Đồng bộ cập nhật trạng thái Job sang "submitted"
                job.Status = "submitted";
                job.UpdatedAt = DateTime.UtcNow;

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

        _logger.LogInformation("Sinh viên {StudentId} nộp bài deliverable v{Version} cho Job {JobId}. Trạng thái Job cập nhật: submitted.", studentId, createdEntity.Version, jobId);
        return MapToDeliverableDto(created, isEmployer: false);
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

        // BẢO MẬT & TOÀN VẸN NGHIỆP VỤ: Đảm bảo bản nộp thuộc về ứng viên đang được thuê chính thức hiện tại
        if (!job.HiredApplicantId.HasValue || deliverable.StudentId != job.HiredApplicantId.Value)
        {
            throw new BusinessException("Bản nộp sản phẩm này không thuộc về sinh viên đang được thuê hiện tại của công việc.");
        }

        if (string.Equals(deliverable.Status, "cancelled", StringComparison.OrdinalIgnoreCase))
        {
            throw new BusinessException("Bản nộp sản phẩm này đã bị hủy do sinh viên trước đó đã rút khỏi công việc.");
        }

        if (job.Status == "completed")
        {
            throw new BusinessException("Công việc này đã hoàn thành và nghiệm thu xong, không thể đánh giá lại sản phẩm.");
        }

        if (job.Status == "cancelled")
        {
            throw new BusinessException("Công việc này đã bị hủy, không thể đánh giá sản phẩm.");
        }

        if (job.Status != "submitted")
        {
            throw new BusinessException("Công việc hiện không ở trạng thái chờ duyệt sản phẩm.");
        }

        if (deliverable.Status != "submitted")
        {
            throw new BusinessException("Bản nộp sản phẩm này đã được đánh giá trước đó.");
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
            job.Status = "revision_requested";
            job.UpdatedAt = DateTime.UtcNow;
        }
        else if (normalizedStatus == "accepted")
        {
            // Cập nhật trạng thái Job sang completed
            job.Status = "completed";
            job.UpdatedAt = DateTime.UtcNow;

            // Cập nhật Application của sinh viên sang completed
            var application = await _dbContext.Applications
                .FirstOrDefaultAsync(a => a.JobId == jobId && a.StudentId == deliverable.StudentId, cancellationToken);
            if (application != null)
            {
                application.Status = "completed";
                application.UpdatedAt = DateTime.UtcNow;
            }

            // Tăng số việc đã xong (JobsDoneCount) và điểm uy tín (ReliabilityScore) của sinh viên
            var student = await _dbContext.Users
                .FirstOrDefaultAsync(u => u.Id == deliverable.StudentId, cancellationToken);
            if (student != null)
            {
                student.JobsDoneCount += 1;
                student.ReliabilityScore = Math.Min(100, student.ReliabilityScore + 3);
                _logger.LogInformation("Sinh viên {StudentId} hoàn thành công việc {JobId}. JobsDoneCount: {JobsDone}, ReliabilityScore: {Score}.", 
                    student.Id, jobId, student.JobsDoneCount, student.ReliabilityScore);
            }

            // Ghi nhận giải ngân Escrow thực tế vào Transaction ledger
            if (job.Budget > 0)
            {
                var escrowReleaseTx = new Transaction
                {
                    UserId = deliverable.StudentId,
                    Type = "escrow_release",
                    Label = $"Nhận thù lao giải ngân công việc #{job.Id} · {job.Title}",
                    Amount = job.Budget,
                    Sign = 1,
                    ReferenceId = job.Id,
                    CreatedAt = DateTime.UtcNow
                };
                await _dbContext.Transactions.AddAsync(escrowReleaseTx, cancellationToken);
                _logger.LogInformation("Đã tạo giao dịch escrow_release cho sinh viên {StudentId} với số tiền {Amount}đ từ Job {JobId}.", 
                    deliverable.StudentId, job.Budget, job.Id);
            }
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

        _logger.LogInformation("Nhà tuyển dụng {EmployerId} đã duyệt deliverable {DeliverableId} với trạng thái {Status}. Trạng thái Job: {JobStatus}.", 
            employerId, deliverableId, normalizedStatus, job.Status);
        return MapToDeliverableDto(deliverable, isEmployer: true);
    }

    public async Task<(Stream Stream, string ContentType, string FileName)?> GetDeliverableFileStreamAsync(
        int userId,
        int jobId,
        int deliverableId,
        string type = "final",
        CancellationToken cancellationToken = default)
    {
        var job = await _dbContext.Jobs
            .AsNoTracking()
            .FirstOrDefaultAsync(j => j.Id == jobId, cancellationToken);

        if (job == null)
        {
            throw new BusinessException("Công việc không tồn tại.");
        }

        var deliverable = await _dbContext.JobDeliverables
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == deliverableId && d.JobId == jobId, cancellationToken);

        if (deliverable == null)
        {
            throw new BusinessException("Sản phẩm bàn giao không tồn tại.");
        }

        // Quyền truy cập IDOR: Chỉ Nhà tuyển dụng đăng việc HOẶC Sinh viên nộp deliverable này mới được tải
        var isEmployer = job.EmployerId == userId;
        var isStudent = deliverable.StudentId == userId;

        if (!isEmployer && !isStudent)
        {
            throw new BusinessException("Bạn không có quyền truy cập sản phẩm bàn giao này.");
        }

        var isAccepted = string.Equals(deliverable.Status, "accepted", StringComparison.OrdinalIgnoreCase);

        // ⚠️ BẢO VỆ SẢN PHẨM: Nếu Nhà tuyển dụng yêu cầu tải bản Final, bắt buộc sản phẩm phải đã được duyệt (accepted)
        if (isEmployer && string.Equals(type, "final", StringComparison.OrdinalIgnoreCase))
        {
            if (!isAccepted)
            {
                throw new BusinessException("Chỉ có thể tải bản gốc (Final) sau khi bạn đã xác nhận nghiệm thu sản phẩm và giải ngân cho sinh viên.");
            }
        }

        var isVideo = IsVideoFile(deliverable.FileName, deliverable.FileType);
        var isDocument = IsDocumentFile(deliverable.FileName, deliverable.FileType);
        var hasWatermarkedPreview = !string.IsNullOrWhiteSpace(deliverable.PreviewFileUrl)
            && !string.Equals(deliverable.PreviewFileUrl, deliverable.FinalFileUrl, StringComparison.OrdinalIgnoreCase);

        // ⚠️ BẢO VỆ BẢN PREVIEW (Zero-Trust): Nhà tuyển dụng chỉ được xem trước nếu file THỰC SỰ có bản đóng watermark server-side HOẶC là video/tài liệu xem qua Secure Viewer có watermark overlay
        if (isEmployer && string.Equals(type, "preview", StringComparison.OrdinalIgnoreCase) && !isAccepted)
        {
            if (!hasWatermarkedPreview && !isVideo && !isDocument)
            {
                throw new BusinessException("Định dạng tệp này không hỗ trợ xem trước có watermark. Để bảo vệ quyền tác giả của sinh viên, tệp gốc hoàn chỉnh chỉ được mở sau khi bạn xác nhận nghiệm thu sản phẩm.");
            }
        }

        // Nếu deliverable là liên kết ngoài (GitHub/Figma/Drive), không thể stream từ R2
        if (string.Equals(deliverable.FileType, "url", StringComparison.OrdinalIgnoreCase))
        {
            throw new BusinessException("Sản phẩm bàn giao là liên kết ngoài (GitHub/Figma/Drive), không thể tải về qua hệ thống lưu trữ.");
        }

        string? targetUrl;
        if (string.Equals(type, "preview", StringComparison.OrdinalIgnoreCase))
        {
            if (isEmployer && !isAccepted)
            {
                // Với video/tài liệu xem trước qua Secure Viewer có watermark: nếu chưa có PreviewFileUrl riêng thì stream file để viewer render kèm watermark overlay
                targetUrl = deliverable.PreviewFileUrl ?? ((isVideo || isDocument) ? deliverable.FinalFileUrl : null);
            }
            else
            {
                targetUrl = deliverable.PreviewFileUrl ?? deliverable.FinalFileUrl;
            }
        }
        else
        {
            targetUrl = deliverable.FinalFileUrl ?? deliverable.PreviewFileUrl;
        }

        if (string.IsNullOrWhiteSpace(targetUrl))
        {
            throw new BusinessException("Không tìm thấy đường dẫn file sản phẩm bàn giao.");
        }

        var fileKey = ExtractFileKeyFromUrl(targetUrl);
        if (string.IsNullOrWhiteSpace(fileKey))
        {
            throw new BusinessException("Không xác định được vị trí file trên hệ thống lưu trữ.");
        }

        var downloadResult = await _storageService.DownloadFileAsync(fileKey, cancellationToken);
        if (downloadResult == null)
        {
            throw new BusinessException("Không thể tải file sản phẩm bàn giao từ hệ thống lưu trữ.");
        }

        var knownMime = ext switch
        {
            ".pdf" => "application/pdf",
            ".mp4" or ".m4v" or ".mov" => "video/mp4",
            ".webm" => "video/webm",
            ".avi" => "video/x-msvideo",
            ".mp3" => "audio/mpeg",
            ".wav" => "audio/wav",
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".webp" => "image/webp",
            ".gif" => "image/gif",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".doc" => "application/msword",
            ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".xls" => "application/vnd.ms-excel",
            ".pptx" => "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            ".txt" => "text/plain; charset=utf-8",
            ".zip" => "application/zip",
            ".rar" => "application/x-rar-compressed",
            ".7z" => "application/x-7z-compressed",
            _ => "application/octet-stream"
        };

        var contentType = !string.IsNullOrWhiteSpace(downloadResult.Value.ContentType)
            && downloadResult.Value.ContentType != "application/octet-stream"
            ? downloadResult.Value.ContentType
            : knownMime;

        return (downloadResult.Value.Stream, contentType, deliverable.FileName);
    }

    private static Stream? ApplyImageWatermark(Stream inputStream, string ext, int jobId)
    {
        try
        {
            inputStream.Position = 0;
            using var originalBitmap = SKBitmap.Decode(inputStream);
            if (originalBitmap == null) return null;

            using var surface = SKSurface.Create(new SKImageInfo(originalBitmap.Width, originalBitmap.Height));
            var canvas = surface.Canvas;

            // Vẽ ảnh gốc
            using var originalImage = SKImage.FromBitmap(originalBitmap);
            canvas.DrawImage(originalImage, 0, 0, new SKSamplingOptions());

            // Cấu hình chữ Watermark thanh mảnh, trong suốt tinh tế (không che lấp chi tiết ảnh)
            var fontSize = Math.Max(16f, originalBitmap.Width / 26f);
            using var typeface = SKTypeface.FromFamilyName("Arial", SKFontStyleWeight.SemiBold, SKFontStyleWidth.Normal, SKFontStyleSlant.Upright);
            using var font = new SKFont(typeface, fontSize);

            using var fillPaint = new SKPaint
            {
                Color = new SKColor(255, 255, 255, 48), // Màu trắng mờ tinh tế ~18%
                IsAntialias = true
            };

            using var strokePaint = new SKPaint
            {
                Color = new SKColor(0, 0, 0, 26), // Viền tối siêu mờ
                IsAntialias = true,
                Style = SKPaintStyle.Stroke,
                StrokeWidth = 1
            };

            var mainLabel = $"SKILLBRIDGE · BẢN XEM TRƯỚC · Job #{jobId}";

            // 1. Vẽ 1 đường chéo thanh mảnh chạy qua trung tâm ảnh
            canvas.Save();
            canvas.Translate(originalBitmap.Width / 2f, originalBitmap.Height / 2f);
            canvas.RotateDegrees(-22);

            canvas.DrawText(mainLabel, 0, 0, SKTextAlign.Center, font, strokePaint);
            canvas.DrawText(mainLabel, 0, 0, SKTextAlign.Center, font, fillPaint);

            canvas.Restore();

            // 2. Vẽ huy hiệu bản quyền nhỏ kín đáo ở góc dưới bên phải
            var badgeFontSize = Math.Max(11f, fontSize * 0.45f);
            using var badgeFont = new SKFont(typeface, badgeFontSize);
            var badgeLabel = $"© SkillBridge Protected · Job #{jobId}";
            var badgeMargin = 16f;
            canvas.DrawText(badgeLabel, originalBitmap.Width - badgeMargin, originalBitmap.Height - badgeMargin, SKTextAlign.Right, badgeFont, fillPaint);

            using var image = surface.Snapshot();
            var encodedFormat = ext.ToLowerInvariant() switch
            {
                ".png" => SKEncodedImageFormat.Png,
                ".webp" => SKEncodedImageFormat.Webp,
                _ => SKEncodedImageFormat.Jpeg
            };

            using var data = image.Encode(encodedFormat, 85);
            var memoryStream = new MemoryStream();
            data.SaveTo(memoryStream);
            memoryStream.Position = 0;
            return memoryStream;
        }
        catch
        {
            return null;
        }
    }

    private static Stream? ApplyPdfWatermark(Stream inputStream, int jobId)
    {
        try
        {
            inputStream.Position = 0;
            using var document = PdfReader.Open(inputStream, PdfDocumentOpenMode.Modify);

            var font = new XFont("Helvetica", 22, XFontStyle.Bold);
            var watermarkColor = XColor.FromArgb(45, 99, 102, 241);
            var brush = new XSolidBrush(watermarkColor);
            var text = $"SKILLBRIDGE · BẢN XEM TRƯỚC · Job #{jobId}";

            for (int i = 0; i < document.Pages.Count; i++)
            {
                var page = document.Pages[i];
                using var gfx = XGraphics.FromPdfPage(page);

                var size = gfx.MeasureString(text, font);
                var centerX = page.Width.Point / 2;
                var centerY = page.Height.Point / 2;

                gfx.Save();
                gfx.TranslateTransform(centerX, centerY);
                gfx.RotateTransform(-30);
                gfx.DrawString(text, font, brush, -size.Width / 2, size.Height / 2);
                gfx.Restore();

                var badgeFont = new XFont("Helvetica", 10, XFontStyle.Regular);
                var badgeText = $"© SkillBridge Protected · Job #{jobId}";
                gfx.DrawString(badgeText, badgeFont, brush, page.Width.Point - 180, page.Height.Point - 18);
            }

            var outputStream = new MemoryStream();
            document.Save(outputStream, false);
            outputStream.Position = 0;
            return outputStream;
        }
        catch
        {
            return null;
        }
    }

    private static string? ExtractFileKeyFromUrl(string? fileUrl)
    {
        if (string.IsNullOrWhiteSpace(fileUrl)) return null;

        if (Uri.TryCreate(fileUrl, UriKind.Absolute, out var uri))
        {
            var path = Uri.UnescapeDataString(uri.AbsolutePath).TrimStart('/');
            var idx = path.IndexOf("job-deliverables/", StringComparison.OrdinalIgnoreCase);
            if (idx >= 0)
            {
                return path[idx..];
            }
            return path;
        }

        return fileUrl;
    }

    private static DeliverableDto MapToDeliverableDto(JobDeliverable d, bool isEmployer)
    {
        var isAccepted = string.Equals(d.Status, "accepted", StringComparison.OrdinalIgnoreCase);
        var isVideo = IsVideoFile(d.FileName, d.FileType);
        var isDocument = IsDocumentFile(d.FileName, d.FileType);

        var hasWatermarkedPreview = (!string.IsNullOrWhiteSpace(d.PreviewFileUrl)
            && !string.Equals(d.PreviewFileUrl, d.FinalFileUrl, StringComparison.OrdinalIgnoreCase))
            || isVideo || isDocument;

        var isExternalUrl = string.Equals(d.FileType, "url", StringComparison.OrdinalIgnoreCase);

        // ⚠️ Bảo vệ tuyệt mật URL file: KHÔNG BAO GIỜ trả về direct public link của Cloudflare R2!
        // Mọi lượt truy cập file đều được trỏ về endpoint API backend:
        // /api/jobs/{jobId}/deliverables/{id}/download?type=...
        // để bắt buộc qua tầng xác thực JWT, rate limiting, phân quyền IDOR và kiểm tra status accepted.
        string? exposedFinalUrl = null;
        if (!isEmployer || isAccepted)
        {
            if (isExternalUrl)
            {
                exposedFinalUrl = d.FinalFileUrl;
            }
            else if (!string.IsNullOrWhiteSpace(d.FinalFileUrl))
            {
                exposedFinalUrl = $"/api/jobs/{d.JobId}/deliverables/{d.Id}/download?type=final";
            }
        }

        string? exposedPreviewUrl = null;
        if (isExternalUrl)
        {
            exposedPreviewUrl = d.PreviewFileUrl;
        }
        else if (hasWatermarkedPreview)
        {
            exposedPreviewUrl = $"/api/jobs/{d.JobId}/deliverables/{d.Id}/download?type=preview";
        }
        else if (!isEmployer || isAccepted)
        {
            exposedPreviewUrl = exposedFinalUrl;
        }

        // Với video và tài liệu văn phòng khi chưa nghiệm thu, NTD chỉ được xem trên Secure Viewer có watermark, KHÔNG được tải file thô về máy
        var canDownloadPreview = (!isEmployer || isAccepted) || (hasWatermarkedPreview && !isVideo && !isDocument);

        return new DeliverableDto
        {
            Id = d.Id,
            JobId = d.JobId,
            StudentId = d.StudentId,
            StudentName = d.Student?.FullName ?? "Sinh viên",
            Version = d.Version,
            PreviewFileUrl = exposedPreviewUrl,
            FinalFileUrl = exposedFinalUrl,
            ExternalUrl = d.ExternalUrl,
            FileName = d.FileName,
            FileType = d.FileType ?? string.Empty,
            Note = d.Note,
            Status = d.Status,
            HasWatermarkedPreview = hasWatermarkedPreview,
            CanDownloadPreview = canDownloadPreview,
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
