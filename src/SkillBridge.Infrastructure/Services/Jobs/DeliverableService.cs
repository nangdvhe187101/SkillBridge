using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Jobs;
using SkillBridge.Application.Interfaces.Jobs;
using SkillBridge.Application.Interfaces.Storage;
using SkillBridge.Application.Interfaces.Media;
using SkillBridge.Application.Interfaces.Payments;
using SkillBridge.Application.Interfaces.Users;
using SkillBridge.Application.Interfaces.Notifications;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Services.Jobs;

public class DeliverableService : IDeliverableService
{
    private readonly SkillBridgeDbContext _dbContext;
    private readonly IStorageService _storageService;
    private readonly IWatermarkService _watermarkService;
    private readonly IEscrowPaymentService _escrowPaymentService;
    private readonly IUserReliabilityService _reliabilityService;
    private readonly INotificationService _notificationService;
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
        IWatermarkService watermarkService,
        IEscrowPaymentService escrowPaymentService,
        IUserReliabilityService reliabilityService,
        INotificationService notificationService,
        ILogger<DeliverableService> logger)
    {
        _dbContext = dbContext;
        _storageService = storageService;
        _watermarkService = watermarkService;
        _escrowPaymentService = escrowPaymentService;
        _reliabilityService = reliabilityService;
        _notificationService = notificationService;
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
        else
        {
            // Nhà tuyển dụng chỉ xem các bản bàn giao của ứng viên được thuê chính thức (tránh rò rỉ khi job chưa thuê ai hoặc đã reset)
            if (!job.HiredApplicantId.HasValue)
            {
                return new List<DeliverableDto>();
            }

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

        // Kiểm tra thời hạn bàn giao (Deadline)
        if (job.DeadlineAt.HasValue && job.DeadlineAt.Value < DateTime.UtcNow)
        {
            _logger.LogWarning("Sinh viên {StudentId} nộp bài trễ hạn cho Job {JobId}. Hạn chót: {Deadline}, Nộp lúc: {Now}",
                studentId, jobId, job.DeadlineAt.Value, DateTime.UtcNow);
        }

        string? previewUrl = null;
        string? finalUrl = null;
        string cleanFileName = fileName != null ? SanitizeAndCleanFileName(fileName) : "external_link";
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

            cleanFileName = SanitizeAndCleanFileName(fileName);
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

            // 2. Tạo bản Preview có Watermark (Hỗ trợ định dạng qua IWatermarkService)
            if (_watermarkService.IsSupported(fileExt))
            {
                using var sourceStream = new MemoryStream(fileBytes);
                using var watermarkedStream = _watermarkService.ApplyWatermark(sourceStream, fileExt, jobId);
                if (watermarkedStream != null)
                {
                    var previewFileName = $"preview_{Guid.NewGuid():N}_{cleanFileName}";
                    var isPdf = string.Equals(fileExt, ".pdf", StringComparison.OrdinalIgnoreCase);
                    var previewContentType = isPdf ? "application/pdf" : (contentType ?? "image/jpeg");

                    var uploadPreviewResult = await _storageService.UploadStreamAsync(
                        watermarkedStream,
                        previewFileName,
                        previewContentType,
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

            var newVersion = currentMaxVersion + 1;
            var ext = Path.GetExtension(cleanFileName).ToLowerInvariant();
            var standardizedName = $"SkillBridge_Job{jobId}_v{newVersion}{ext}";

            var deliverable = new JobDeliverable
            {
                JobId = jobId,
                StudentId = studentId,
                Version = newVersion,
                PreviewFileUrl = previewUrl,
                FinalFileUrl = finalUrl,
                ExternalUrl = externalUrl,
                FileName = string.IsNullOrWhiteSpace(externalUrl) ? standardizedName : "external_link",
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

                // Đồng bộ trạng thái Application của sinh viên sang "submitted"
                var studentApp = await _dbContext.Applications
                    .FirstOrDefaultAsync(a => a.JobId == jobId && a.StudentId == studentId, cancellationToken);
                if (studentApp != null && studentApp.Status == "hired")
                {
                    studentApp.Status = "submitted";
                    studentApp.UpdatedAt = DateTime.UtcNow;
                }

                // Gửi thông báo cho Nhà tuyển dụng
                await _notificationService.SendAsync(
                    job.EmployerId,
                    "📤",
                    $"Sinh viên đã nộp sản phẩm bàn giao v{deliverable.Version} cho công việc \"{job.Title}\".",
                    $"/jobs/{job.Id}/applicants",
                    cancellationToken);

                await _dbContext.SaveChangesAsync(cancellationToken);
                createdEntity = deliverable;
                break;
            }
            catch (DbUpdateException ex) when (IsDuplicateVersionError(ex) && attempt < maxRetries)
            {
                _dbContext.Entry(deliverable).State = EntityState.Detached;
                _logger.LogWarning(ex, "Phát hiện xung đột version khi nộp deliverable cho Job {JobId}. Đang thử lại lần {Attempt}...", jobId, attempt);
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
        var normalizedStatus = request.Status?.ToLowerInvariant().Trim() ?? string.Empty;
        if (normalizedStatus != "accepted" && normalizedStatus != "revision_requested")
        {
            throw new BusinessException("Trạng thái đánh giá không hợp lệ (chỉ chấp nhận 'accepted' hoặc 'revision_requested').");
        }

        var executionStrategy = _dbContext.Database.CreateExecutionStrategy();
        return await executionStrategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);

            // Khóa hàng Job bằng SELECT ... FOR UPDATE bên trong transaction để chống race condition (double click / duplicate review request)
            var currentJob = await GetJobWithLockAsync(jobId, cancellationToken);

            if (currentJob == null || currentJob.EmployerId != employerId)
            {
                throw new BusinessException("Công việc không tồn tại hoặc bạn không có quyền đánh giá sản phẩm của công việc này.");
            }

            var currentDeliverable = await _dbContext.JobDeliverables
                .Include(d => d.Student)
                .Include(d => d.DeliverableFeedbacks)
                    .ThenInclude(f => f.Employer)
                .FirstOrDefaultAsync(d => d.Id == deliverableId && d.JobId == jobId, cancellationToken);

            if (currentDeliverable == null)
            {
                throw new BusinessException("Bản nộp sản phẩm không tồn tại.");
            }

            // Kiểm soát tranh chấp & Idempotency: Nếu job hoặc deliverable không còn ở trạng thái submitted
            if (currentJob.Status != "submitted" || currentDeliverable.Status != "submitted")
            {
                _logger.LogWarning("⚠️ PHÁT HIỆN TRÙNG LẶP/RACE CONDITION khi duyệt sản phẩm: Job #{JobId} (Status={JobStatus}), Deliverable #{DeliverableId} (Status={DeliverableStatus}), EmployerId={EmployerId}. Hủy bỏ request trùng.",
                    jobId, currentJob.Status, deliverableId, currentDeliverable.Status, employerId);
                throw new BusinessException("Công việc hoặc bản nộp này không còn ở trạng thái chờ duyệt sản phẩm (có thể đã được xử lý trước đó).");
            }

            // BẢO MẬT & TOÀN VẸN NGHIỆP VỤ: Đảm bảo bản nộp thuộc về ứng viên đang được thuê chính thức hiện tại
            if (!currentJob.HiredApplicantId.HasValue || currentDeliverable.StudentId != currentJob.HiredApplicantId.Value)
            {
                throw new BusinessException("Bản nộp sản phẩm này không thuộc về sinh viên đang được thuê hiện tại của công việc.");
            }

            if (string.Equals(currentDeliverable.Status, "cancelled", StringComparison.OrdinalIgnoreCase))
            {
                throw new BusinessException("Bản nộp sản phẩm này đã bị hủy do sinh viên trước đó đã rút khỏi công việc.");
            }

            decimal? computedBudget = null;
            decimal? computedCommission = null;
            decimal? computedNetPayout = null;

            var filesToDelete = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            if (normalizedStatus == "revision_requested")
            {
                if (currentJob.RevisionCount >= currentJob.RevisionLimit)
                {
                    throw new BusinessException($"Công việc này đã đạt giới hạn chỉnh sửa tối đa ({currentJob.RevisionLimit} lần).");
                }
                currentJob.RevisionCount += 1;
                currentJob.Status = "revision_requested";
                currentJob.UpdatedAt = DateTime.UtcNow;

                // Đưa Application về lại trạng thái "hired" (đang làm) để sinh viên tiếp tục hoàn thiện
                var studentApp = await _dbContext.Applications
                    .FirstOrDefaultAsync(a => a.JobId == jobId && a.StudentId == currentDeliverable.StudentId, cancellationToken);
                if (studentApp != null && studentApp.Status == "submitted")
                {
                    studentApp.Status = "hired";
                    studentApp.UpdatedAt = DateTime.UtcNow;
                }
            }
            else if (normalizedStatus == "accepted")
            {
                // Cập nhật trạng thái Job sang completed và giải phóng EscrowAmount (đã giải ngân xong cho sinh viên)
                currentJob.Status = "completed";
                currentJob.EscrowAmount = null;
                currentJob.UpdatedAt = DateTime.UtcNow;

                // Cập nhật Application của sinh viên sang completed
                var application = await _dbContext.Applications
                    .FirstOrDefaultAsync(a => a.JobId == jobId && a.StudentId == currentDeliverable.StudentId, cancellationToken);
                if (application != null)
                {
                    application.Status = "completed";
                    application.UpdatedAt = DateTime.UtcNow;
                }

                // Tăng số việc đã xong và điểm uy tín cho sinh viên (qua IUserReliabilityService)
                await _reliabilityService.RewardCompletionAsync(currentDeliverable.StudentId, 3, cancellationToken);

                // Tính toán hoa hồng nền tảng (VIP Business: 5%, Thường: 10%)
                decimal commissionRate = 0.10m;
                var hasVipSubscription = await _dbContext.Subscriptions
                    .AnyAsync(s => s.UserId == currentJob.EmployerId && s.Status == "active" && s.PlanName.Contains("VIP"), cancellationToken);
                if (hasVipSubscription)
                {
                    commissionRate = 0.05m;
                }

                computedBudget = currentJob.Budget;
                computedCommission = Math.Round(currentJob.Budget * commissionRate);
                computedNetPayout = currentJob.Budget - computedCommission.Value;

                // Ghi nhận giải ngân Escrow thực tế vào Transaction ledger & cập nhật ví sinh viên (qua IEscrowPaymentService)
                if (currentJob.Budget > 0)
                {
                    await _escrowPaymentService.ReleaseEscrowAsync(
                        currentDeliverable.StudentId,
                        currentJob.EmployerId,
                        currentJob.Id,
                        currentJob.Title,
                        currentJob.Budget,
                        cancellationToken);
                }

                // 🚀 TỐI ƯU HÓA CLOUDFLARE R2: Chuẩn bị dọn dẹp các tệp nháp cũ & bản watermark dư thừa sau khi nghiệm thu thành công
                if (!string.IsNullOrWhiteSpace(currentDeliverable.PreviewFileUrl)
                    && !string.Equals(currentDeliverable.PreviewFileUrl, currentDeliverable.FinalFileUrl, StringComparison.OrdinalIgnoreCase)
                    && !string.Equals(currentDeliverable.FileType, "url", StringComparison.OrdinalIgnoreCase))
                {
                    var previewKey = StorageKeyHelper.ExtractKey(currentDeliverable.PreviewFileUrl);
                    if (!string.IsNullOrWhiteSpace(previewKey))
                    {
                        filesToDelete.Add(previewKey);
                    }
                    currentDeliverable.PreviewFileUrl = null;
                }

                var olderDeliverables = await _dbContext.JobDeliverables
                    .Where(d => d.JobId == jobId && d.Id != currentDeliverable.Id)
                    .ToListAsync(cancellationToken);

                foreach (var old in olderDeliverables)
                {
                    if (!string.Equals(old.FileType, "url", StringComparison.OrdinalIgnoreCase))
                    {
                        foreach (var url in new[] { old.PreviewFileUrl, old.FinalFileUrl })
                        {
                            var key = StorageKeyHelper.ExtractKey(url);
                            if (!string.IsNullOrWhiteSpace(key))
                            {
                                filesToDelete.Add(key);
                            }
                        }
                    }

                    old.PreviewFileUrl = null;
                    old.FinalFileUrl = null;
                }
            }

            currentDeliverable.Status = normalizedStatus;
            currentDeliverable.ReviewedAt = DateTime.UtcNow;

            if (!string.IsNullOrWhiteSpace(request.FeedbackComment))
            {
                var feedback = new DeliverableFeedback
                {
                    DeliverableId = currentDeliverable.Id,
                    EmployerId = employerId,
                    FeedbackText = request.FeedbackComment.Trim(),
                    CreatedAt = DateTime.UtcNow
                };
                await _dbContext.DeliverableFeedbacks.AddAsync(feedback, cancellationToken);
            }

            await _dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            _logger.LogInformation("Nhà tuyển dụng {EmployerId} đã duyệt deliverable {DeliverableId} với trạng thái {Status}. Trạng thái Job: {JobStatus}.", 
                employerId, deliverableId, normalizedStatus, currentJob.Status);

            // POST-COMMIT: Gửi thông báo và dọn dẹp R2 ngoại tuyến sau khi giao dịch tài chính đã commit an toàn
            if (normalizedStatus == "revision_requested")
            {
                await _notificationService.SendAsync(
                    currentDeliverable.StudentId,
                    "🔄",
                    $"Nhà tuyển dụng yêu cầu chỉnh sửa bản bàn giao v{currentDeliverable.Version} cho công việc \"{currentJob.Title}\".",
                    "/mywork",
                    cancellationToken);
            }
            else if (normalizedStatus == "accepted")
            {
                var payoutText = computedNetPayout.HasValue && computedCommission.HasValue && computedCommission.Value > 0
                    ? $"Thù lao {computedNetPayout.Value:N0}đ (đã trừ phí sàn {computedCommission.Value:N0}đ)"
                    : $"Thù lao {currentJob.Budget:N0}đ";

                await _notificationService.SendAsync(
                    currentDeliverable.StudentId,
                    "🎉",
                    $"Sản phẩm bàn giao cho công việc \"{currentJob.Title}\" đã được nghiệm thu thành công! {payoutText} đã được chuyển vào ví của bạn.",
                    "/mywork",
                    cancellationToken);

                // Dọn dẹp tệp R2 sau commit
                foreach (var key in filesToDelete)
                {
                    try
                    {
                        await _storageService.DeleteFileAsync(key, cancellationToken);
                        _logger.LogInformation("Đã dọn dẹp tệp R2 dư thừa sau nghiệm thu: {FileKey} (Job #{JobId}).", key, jobId);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Không thể xóa tệp {FileKey} trên Cloudflare R2 khi dọn dẹp sau nghiệm thu Job #{JobId}.", key, jobId);
                    }
                }
            }

            var dto = MapToDeliverableDto(currentDeliverable, isEmployer: true);
            dto.Budget = computedBudget;
            dto.Commission = computedCommission;
            dto.NetPayout = computedNetPayout;
            return dto;
        });
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

        if (string.Equals(deliverable.Status, "cancelled", StringComparison.OrdinalIgnoreCase))
        {
            throw new BusinessException("Sản phẩm bàn giao này đã bị hủy.");
        }

        var ext = Path.GetExtension(deliverable.FileName)?.ToLowerInvariant() ?? string.Empty;

        // Quyền truy cập IDOR: Chỉ Nhà tuyển dụng đăng việc HOẶC Sinh viên nộp deliverable này mới được tải
        var isEmployer = job.EmployerId == userId;
        var isStudent = deliverable.StudentId == userId;

        if (!isEmployer && !isStudent)
        {
            throw new BusinessException("Bạn không có quyền truy cập sản phẩm bàn giao này.");
        }

        var isAccepted = string.Equals(deliverable.Status, "accepted", StringComparison.OrdinalIgnoreCase);
        var isPreviewRequest = string.Equals(type, "preview", StringComparison.OrdinalIgnoreCase);

        // ⚠️ BẢO VỆ SẢN PHẨM: Nếu Nhà tuyển dụng chưa nghiệm thu sản phẩm, TUYỆT ĐỐI KHÔNG được tải bản gốc (Final)
        if (isEmployer && !isAccepted && !isPreviewRequest)
        {
            throw new BusinessException("Chỉ có thể tải bản gốc (Final) sau khi bạn đã xác nhận nghiệm thu sản phẩm và giải ngân cho sinh viên.");
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
            throw new BusinessException("Tệp sản phẩm của bản nộp này đã được dọn dẹp để tối ưu hóa lưu trữ sau khi công việc được nghiệm thu. Vui lòng tải bản nghiệm thu chính thức (Final).");
        }

        var fileKey = StorageKeyHelper.ExtractKey(targetUrl);
        if (string.IsNullOrWhiteSpace(fileKey))
        {
            throw new BusinessException("Không xác định được vị trí file trên hệ thống lưu trữ.");
        }

        var downloadResult = await _storageService.DownloadFileAsync(fileKey, cancellationToken);
        if (downloadResult == null)
        {
            throw new BusinessException("Không thể tải file sản phẩm bàn giao từ hệ thống lưu trữ.");
        }

        if (string.IsNullOrEmpty(ext) && !string.IsNullOrWhiteSpace(targetUrl))
        {
            ext = Path.GetExtension(targetUrl)?.ToLowerInvariant() ?? string.Empty;
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

        var downloadFileName = GenerateDownloadFileName(deliverable.FileName, deliverable.JobId, deliverable.Version, type);
        return (downloadResult.Value.Stream, contentType, downloadFileName);
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

    private static string SanitizeAndCleanFileName(string originalName)
    {
        var fileNameOnly = Path.GetFileName(originalName).Trim();
        var ext = Path.GetExtension(fileNameOnly).ToLowerInvariant();
        var baseName = Path.GetFileNameWithoutExtension(fileNameOnly);

        // Thay thế khoảng trắng và ký tự không an toàn bằng gạch dưới
        var safeBase = Regex.Replace(baseName, @"[^\w\-.]", "_").Trim('_');
        if (string.IsNullOrWhiteSpace(safeBase))
        {
            safeBase = "SanPham_BanGiao";
        }

        // Cắt gọn nếu tên file quá dài
        if (safeBase.Length > 60)
        {
            safeBase = safeBase.Substring(0, 60);
        }

        return $"{safeBase}{ext}";
    }

    private static string GenerateDownloadFileName(string fileName, int jobId, int version, string type)
    {
        var ext = Path.GetExtension(fileName)?.ToLowerInvariant() ?? string.Empty;
        var baseName = Path.GetFileNameWithoutExtension(fileName);
        var isPreview = string.Equals(type, "preview", StringComparison.OrdinalIgnoreCase);
        var previewTag = isPreview ? "Preview_" : "";

        if (baseName.StartsWith($"SkillBridge_Job{jobId}", StringComparison.OrdinalIgnoreCase))
        {
            return $"{baseName}{ext}";
        }

        return $"SkillBridge_Job{jobId}_v{version}_{previewTag}{baseName}{ext}";
    }

    private async Task<Job?> GetJobWithLockAsync(int jobId, CancellationToken ct = default)
    {
        if (_dbContext.Database.IsRelational())
        {
            return await _dbContext.Jobs
                .FromSqlRaw("SELECT * FROM jobs WHERE id = {0} FOR UPDATE", jobId)
                .SingleOrDefaultAsync(ct);
        }
        return await _dbContext.Jobs.FirstOrDefaultAsync(j => j.Id == jobId, ct);
    }
}