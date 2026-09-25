using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Chat;
using SkillBridge.Application.DTOs.Disputes;
using SkillBridge.Application.Interfaces.Disputes;
using SkillBridge.Application.Interfaces.Notifications;
using SkillBridge.Application.Interfaces.Payments;
using SkillBridge.Application.Interfaces.Storage;
using SkillBridge.Application.Interfaces.Users;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Services.Disputes;

public class DisputeService : IDisputeService
{
    private readonly SkillBridgeDbContext _dbContext;
    private readonly IStorageService _storageService;
    private readonly IEscrowPaymentService _escrowPaymentService;
    private readonly IUserReliabilityService _userReliabilityService;
    private readonly INotificationService _notificationService;
    private readonly ILogger<DisputeService> _logger;

    public DisputeService(
        SkillBridgeDbContext dbContext,
        IStorageService storageService,
        IEscrowPaymentService escrowPaymentService,
        IUserReliabilityService userReliabilityService,
        INotificationService notificationService,
        ILogger<DisputeService> logger)
    {
        _dbContext = dbContext;
        _storageService = storageService;
        _escrowPaymentService = escrowPaymentService;
        _userReliabilityService = userReliabilityService;
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task<DisputeDto> CreateDisputeAsync(int userId, CreateDisputeRequest request, CancellationToken ct = default)
    {
        if (request == null) throw new ArgumentNullException(nameof(request));
        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            throw new BusinessException("Lý do khiếu nại không được để trống.");
        }

        var job = await _dbContext.Jobs
            .Include(j => j.Employer)
            .Include(j => j.HiredApplicant)
            .FirstOrDefaultAsync(j => j.Id == request.JobId, ct);

        if (job == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy công việc với mã #{request.JobId}.");
        }

        // Xác định vai trò của người gửi
        var isEmployer = job.EmployerId == userId;
        var isStudent = job.HiredApplicantId == userId;

        if (!isEmployer && !isStudent)
        {
            throw new UnauthorizedAccessException("Bạn không phải là bên liên quan trong công việc này.");
        }

        var studentId = job.HiredApplicantId;
        if (!studentId.HasValue || studentId.Value <= 0)
        {
            throw new BusinessException("Công việc chưa được giao kết hợp đồng với sinh viên nào, không thể mở khiếu nại.");
        }

        // Kiểm tra trạng thái Job hợp lệ để khiếu nại (BR-DISP-01)
        var validStatuses = new[] { "in_progress", "submitted", "revision_requested", "disputed" };
        if (!validStatuses.Contains(job.Status?.ToLowerInvariant()))
        {
            throw new BusinessException($"Không thể mở khiếu nại cho công việc ở trạng thái '{job.Status}'. Chỉ áp dụng cho công việc đang tiến hành hoặc chờ nghiệm thu.");
        }

        // Chặn trùng lặp hồ sơ đang mở (E-DISP-03)
        var existingDispute = await _dbContext.Disputes
            .FirstOrDefaultAsync(d => d.JobId == request.JobId && d.Status == "open", ct);
        if (existingDispute != null)
        {
            throw new BusinessException($"Công việc này đang có hồ sơ khiếu nại #{existingDispute.Id} chờ phân xử.");
        }

        var filedBy = isEmployer ? "employer" : "student";
        var now = DateTime.UtcNow;

        // Tạo bản ghi Dispute
        var dispute = new Dispute
        {
            JobId = job.Id,
            StudentId = studentId.Value,
            EmployerId = job.EmployerId,
            DeliverableId = request.DeliverableId,
            Amount = job.Budget,
            FiledBy = filedBy,
            Origin = request.Origin ?? "manual",
            Reason = request.Reason.Trim(),
            Status = "open",
            FiledAt = now
        };

        await _dbContext.Disputes.AddAsync(dispute, ct);

        // Khóa trạng thái công việc sang 'disputed'
        job.Status = "disputed";
        job.UpdatedAt = now;

        await _dbContext.SaveChangesAsync(ct);
        _logger.LogInformation("Đã khởi tạo Dispute #{DisputeId} cho Job #{JobId} bởi User {UserId} ({Role})",
            dispute.Id, job.Id, userId, filedBy);

        // Xử lý tải các tệp chứng cứ ban đầu (nếu có)
        if (request.Files != null && request.Files.Count > 0)
        {
            foreach (var fileModel in request.Files)
            {
                if (fileModel?.Stream == null) continue;
                await SaveEvidenceFileAsync(dispute.Id, userId, fileModel.Stream, fileModel.FileName, fileModel.ContentType, fileModel.Description, ct);
            }
        }

        // Gửi thông báo cho đối phương
        var opponentId = isEmployer ? studentId.Value : job.EmployerId;
        var senderTitle = isEmployer ? "Nhà tuyển dụng" : "Sinh viên";
        try
        {
            await _notificationService.SendAsync(
                opponentId,
                "⚠️",
                $"{senderTitle} đã gửi yêu cầu khiếu nại cho công việc '{job.Title}'. Bạn có 72 giờ để bổ sung bằng chứng phản biện.",
                "/mywork",
                ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Lỗi khi gửi thông báo Dispute #{DisputeId} cho User {OpponentId}", dispute.Id, opponentId);
        }

        return await MapToDisputeDtoAsync(dispute, ct);
    }

    public async Task<DisputeEvidenceDto> AddEvidenceAsync(int userId, int disputeId, AddEvidenceRequest request, CancellationToken ct = default)
    {
        if (request == null) throw new ArgumentNullException(nameof(request));
        if (request.Stream == null)
        {
            throw new BusinessException("Vui lòng đính kèm tệp bằng chứng.");
        }

        var dispute = await _dbContext.Disputes
            .Include(d => d.Job)
            .FirstOrDefaultAsync(d => d.Id == disputeId, ct);

        if (dispute == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy khiếu nại #{disputeId}.");
        }

        // Kiểm tra quyền
        if (dispute.StudentId != userId && dispute.EmployerId != userId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền nộp chứng cứ cho khiếu nại này.");
        }

        if (dispute.Status != "open")
        {
            throw new BusinessException("Hồ sơ khiếu nại này đã đóng, không thể nộp thêm chứng cứ.");
        }

        // Kiểm tra thời hạn 72 giờ
        var deadline = dispute.FiledAt.AddHours(72);
        if (DateTime.UtcNow > deadline)
        {
            throw new BusinessException("Đã hết thời hạn 72 giờ nộp chứng cứ bổ sung. Hồ sơ đang chờ Trọng tài viên phân xử.");
        }

        var evidence = await SaveEvidenceFileAsync(dispute.Id, userId, request.Stream, request.FileName, request.ContentType, request.Description, ct);

        // Gửi thông báo cho đối phương
        var opponentId = (userId == dispute.EmployerId) ? dispute.StudentId : dispute.EmployerId;
        try
        {
            await _notificationService.SendAsync(
                opponentId,
                "📎",
                $"Đối tác đã nộp thêm bằng chứng mới cho vụ khiếu nại công việc #{dispute.JobId}.",
                "/mywork",
                ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Lỗi khi gửi thông báo bằng chứng mới cho User {OpponentId}", opponentId);
        }

        var uploader = await _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);

        return new DisputeEvidenceDto
        {
            Id = evidence.Id,
            DisputeId = evidence.DisputeId,
            UploadedByUserId = evidence.SubmittedBy,
            UploadedByName = uploader?.FullName ?? "Người dùng",
            UploadedByRole = (userId == dispute.EmployerId) ? "employer" : "student",
            FileUrl = evidence.FileUrl ?? string.Empty,
            FileType = evidence.FileType ?? string.Empty,
            Description = evidence.EvidenceText,
            UploadedAt = evidence.CreatedAt
        };
    }

    public async Task<List<DisputeDto>> GetMyDisputesAsync(int userId, CancellationToken ct = default)
    {
        var disputes = await _dbContext.Disputes
            .AsNoTracking()
            .Include(d => d.Job)
            .Include(d => d.Student)
            .Include(d => d.Employer)
            .Include(d => d.ResolvedByNavigation)
            .Include(d => d.DisputeEvidences)
            .Where(d => d.StudentId == userId || d.EmployerId == userId)
            .OrderByDescending(d => d.FiledAt)
            .ToListAsync(ct);

        var now = DateTime.UtcNow;
        return disputes.Select(d => MapEntityToDto(d, now)).ToList();
    }

    public async Task<DisputeDetailDto> GetDisputeDetailAsync(int userId, int disputeId, CancellationToken ct = default)
    {
        var dispute = await _dbContext.Disputes
            .AsNoTracking()
            .Include(d => d.Job)
            .Include(d => d.Student)
            .Include(d => d.Employer)
            .Include(d => d.ResolvedByNavigation)
            .Include(d => d.DisputeEvidences)
                .ThenInclude(e => e.SubmittedByNavigation)
            .FirstOrDefaultAsync(d => d.Id == disputeId, ct);

        if (dispute == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy khiếu nại #{disputeId}.");
        }

        var isStudent = dispute.StudentId == userId;
        var isEmployer = dispute.EmployerId == userId;
        var isAdmin = await _dbContext.AdminTeamMembers.AnyAsync(a => a.Id == userId, ct);

        if (!isStudent && !isEmployer && !isAdmin)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền truy cập hồ sơ khiếu nại này.");
        }

        var now = DateTime.UtcNow;
        var baseDto = MapEntityToDto(dispute, now);

        var detail = new DisputeDetailDto
        {
            Id = baseDto.Id,
            JobId = baseDto.JobId,
            JobTitle = baseDto.JobTitle,
            StudentId = baseDto.StudentId,
            StudentName = baseDto.StudentName,
            EmployerId = baseDto.EmployerId,
            EmployerName = baseDto.EmployerName,
            DeliverableId = baseDto.DeliverableId,
            Amount = baseDto.Amount,
            FiledBy = baseDto.FiledBy,
            Origin = baseDto.Origin,
            Reason = baseDto.Reason,
            Status = baseDto.Status,
            Decision = baseDto.Decision,
            PayoutAmount = baseDto.PayoutAmount,
            PayoutToRole = baseDto.PayoutToRole,
            ResolvedNote = baseDto.ResolvedNote,
            FiledAt = baseDto.FiledAt,
            DeadlineAt72h = baseDto.DeadlineAt72h,
            CanSubmitEvidence = baseDto.CanSubmitEvidence,
            ResolvedAt = baseDto.ResolvedAt,
            ResolvedBy = baseDto.ResolvedBy,
            ResolvedByName = baseDto.ResolvedByName,
            EvidenceCount = baseDto.EvidenceCount,
            Evidences = dispute.DisputeEvidences
                .OrderByDescending(e => e.CreatedAt)
                .Select(e => new DisputeEvidenceDto
                {
                    Id = e.Id,
                    DisputeId = e.DisputeId,
                    UploadedByUserId = e.SubmittedBy,
                    UploadedByName = e.SubmittedByNavigation?.FullName ?? "Thành viên",
                    UploadedByRole = (e.SubmittedBy == dispute.EmployerId) ? "employer" : "student",
                    FileUrl = e.FileUrl ?? string.Empty,
                    FileType = e.FileType ?? string.Empty,
                    Description = e.EvidenceText,
                    UploadedAt = e.CreatedAt
                }).ToList()
        };

        return detail;
    }

    public async Task<List<DisputeDto>> GetAdminDisputesAsync(string? status = null, CancellationToken ct = default)
    {
        var query = _dbContext.Disputes
            .AsNoTracking()
            .Include(d => d.Job)
            .Include(d => d.Student)
            .Include(d => d.Employer)
            .Include(d => d.ResolvedByNavigation)
            .Include(d => d.DisputeEvidences)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(d => d.Status == status);
        }

        var list = await query.OrderByDescending(d => d.FiledAt).ToListAsync(ct);
        var now = DateTime.UtcNow;
        return list.Select(d => MapEntityToDto(d, now)).ToList();
    }

    public async Task<DisputeDto> ResolveDisputeAsync(int adminUserId, int disputeId, ResolveDisputeRequest request, CancellationToken ct = default)
    {
        if (request == null) throw new ArgumentNullException(nameof(request));

        if (_dbContext.Database.IsRelational())
        {
            var strategy = _dbContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _dbContext.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
                var result = await ResolveDisputeInternalAsync(adminUserId, disputeId, request, ct);
                await transaction.CommitAsync(ct);

                await SendResolutionNotificationsAsync(result, request.AdminNote, ct);
                return result;
            });
        }

        var res = await ResolveDisputeInternalAsync(adminUserId, disputeId, request, ct);
        await SendResolutionNotificationsAsync(res, request.AdminNote, ct);
        return res;
    }

    private async Task<DisputeDto> ResolveDisputeInternalAsync(int adminUserId, int disputeId, ResolveDisputeRequest request, CancellationToken ct)
    {
        var dispute = await _dbContext.Disputes
            .Include(d => d.Job)
            .FirstOrDefaultAsync(d => d.Id == disputeId, ct);

        if (dispute == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy hồ sơ khiếu nại #{disputeId}.");
        }

        if (dispute.Status == "closed")
        {
            throw new BusinessException($"Khiếu nại #{disputeId} đã được phân xử trước đó (status = closed).");
        }

        var decision = request.Decision?.ToLowerInvariant();
        if (decision != "accept" && decision != "reject" && decision != "split")
        {
            throw new BusinessException("Quyết định phán quyết không hợp lệ. Phải là 'accept', 'reject' hoặc 'split'.");
        }

        var adminMemberId = await EnsureAdminMemberIdAsync(adminUserId, ct);
        var now = DateTime.UtcNow;
        var job = dispute.Job;
        var totalAmount = dispute.Amount;

        decimal studentPayout = 0m;
        decimal employerRefund = 0m;
        string payoutToRole;

        // Phân xử tài chính theo quyết định
        if (decision == "accept")
        {
            // Chấp thuận hoàn toàn yêu cầu của sinh viên: Giải ngân 100%
            studentPayout = totalAmount;
            employerRefund = 0m;
            payoutToRole = "student";

            await _escrowPaymentService.ReleaseEscrowAsync(
                dispute.StudentId,
                dispute.EmployerId,
                dispute.JobId,
                job.Title,
                studentPayout,
                ct);

            // Phạt điểm uy tín NTD
            try
            {
                await _userReliabilityService.PenalizeScoreAsync(
                    dispute.EmployerId,
                    20,
                    $"Thua kiện trọng tài trong vụ việc Job #{dispute.JobId} ({job.Title})",
                    ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Lỗi khi phạt điểm uy tín Employer {EmployerId}", dispute.EmployerId);
            }

            job.Status = "completed";
            job.EscrowAmount = null;
            job.UpdatedAt = now;
        }
        else if (decision == "reject")
        {
            // Bác bỏ yêu cầu sinh viên / Chấp thuận NTD: Hoàn cọc 100%
            studentPayout = 0m;
            employerRefund = totalAmount;
            payoutToRole = "employer";

            await _escrowPaymentService.RefundEscrowAsync(
                dispute.EmployerId,
                dispute.JobId,
                job.Title,
                employerRefund,
                $"Hoàn tiền ký quỹ theo phán quyết trọng tài vụ việc #{dispute.Id}",
                ct);

            // Phạt điểm uy tín Sinh viên
            try
            {
                await _userReliabilityService.PenalizeScoreAsync(
                    dispute.StudentId,
                    20,
                    $"Thua kiện trọng tài trong vụ việc Job #{dispute.JobId} ({job.Title})",
                    ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Lỗi khi phạt điểm uy tín Student {StudentId}", dispute.StudentId);
            }

            job.Status = "cancelled";
            job.EscrowAmount = null;
            job.UpdatedAt = now;
        }
        else
        {
            // Split: Phân chia theo tỷ lệ
            var splitPercent = request.StudentSplitPercent ?? 50m;
            if (splitPercent < 0 || splitPercent > 100)
            {
                throw new BusinessException("Tỷ lệ phân chia cho sinh viên phải nằm trong khoảng từ 0% đến 100%.");
            }

            studentPayout = Math.Round(totalAmount * (splitPercent / 100m), 0);
            employerRefund = totalAmount - studentPayout;
            payoutToRole = "student";

            // Giải ngân phần của sinh viên (thu phí hoa hồng trên phần thực nhận này)
            if (studentPayout > 0)
            {
                await _escrowPaymentService.ReleaseEscrowAsync(
                    dispute.StudentId,
                    dispute.EmployerId,
                    dispute.JobId,
                    job.Title,
                    studentPayout,
                    ct);
            }

            // Hoàn phần tiền dư cho NTD
            if (employerRefund > 0)
            {
                await _escrowPaymentService.RefundEscrowAsync(
                    dispute.EmployerId,
                    dispute.JobId,
                    job.Title,
                    employerRefund,
                    $"Hoàn trả {100 - splitPercent}% tiền ký quỹ theo phán quyết hòa giải vụ việc #{dispute.Id}",
                    ct);
            }

            job.Status = "completed";
            job.EscrowAmount = null;
            job.UpdatedAt = now;
        }

        // Cập nhật trạng thái Dispute
        dispute.Status = "closed";
        dispute.Decision = decision;
        dispute.PayoutAmount = studentPayout;
        dispute.PayoutToRole = payoutToRole;
        dispute.ResolvedNote = request.AdminNote?.Trim() ?? "Đã được Trọng tài viên phân xử giải quyết.";
        dispute.ResolvedAt = now;
        dispute.ResolvedBy = adminMemberId;

        await _dbContext.SaveChangesAsync(ct);
        _logger.LogInformation("Trọng tài đã giải quyết Dispute #{DisputeId}: Decision={Decision}, StudentPayout={StudentPayout}, EmployerRefund={EmployerRefund}",
            dispute.Id, decision, studentPayout, employerRefund);

        return await MapToDisputeDtoAsync(dispute, ct);
    }

    private async Task SendResolutionNotificationsAsync(DisputeDto dispute, string? adminNote, CancellationToken ct)
    {
        try
        {
            var noteMsg = string.IsNullOrWhiteSpace(adminNote) ? string.Empty : $"\nLý do: {adminNote}";
            var studentPayout = dispute.PayoutAmount ?? 0m;
            var employerRefund = dispute.Amount - studentPayout;

            await _notificationService.SendAsync(
                dispute.StudentId,
                "⚖️",
                $"Trọng tài đã phân xử khiếu nại Job #{dispute.JobId}. Số tiền giải ngân cho bạn: {studentPayout:N0}đ.{noteMsg}",
                "/mywork",
                ct);

            await _notificationService.SendAsync(
                dispute.EmployerId,
                "⚖️",
                $"Trọng tài đã phân xử khiếu nại Job #{dispute.JobId}. Số tiền hoàn lại vào ví bạn: {employerRefund:N0}đ.{noteMsg}",
                "/mywork",
                ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Lỗi khi gửi thông báo phán quyết cho các bên trong Dispute #{DisputeId}", dispute.Id);
        }
    }

    public async Task<DisputeChatEvidenceDto> GetChatEvidenceAsync(int adminUserId, int disputeId, CancellationToken ct = default)
    {
        var dispute = await _dbContext.Disputes
            .Include(d => d.Job)
            .Include(d => d.Student)
            .Include(d => d.Employer)
            .FirstOrDefaultAsync(d => d.Id == disputeId, ct);

        if (dispute == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy khiếu nại/tranh chấp với mã #{disputeId}.");
        }

        var status = dispute.Status?.ToLowerInvariant();
        if (status != "open")
        {
            _logger.LogWarning("Admin {AdminUserId} cố gắng xem bằng chứng chat cho Dispute {DisputeId} khi trạng thái là {Status}", adminUserId, disputeId, status);
            throw new UnauthorizedAccessException("Chỉ được phép xem bằng chứng tin nhắn đối với tranh chấp đang ở trạng thái mở (open).");
        }

        var actorId = await EnsureAdminMemberIdAsync(adminUserId, ct);
        var now = DateTime.UtcNow;
        var auditEntry = new AuditLog
        {
            ActorId = actorId,
            ActionText = $"VIEW_CHAT_EVIDENCE: Admin {adminUserId} đã truy xuất dữ liệu lịch sử hội thoại chat cho Dispute #{disputeId}, Job #{dispute.JobId} ({dispute.Job?.Title}) lúc {now:yyyy-MM-dd HH:mm:ss} UTC.",
            CreatedAt = now
        };

        await _dbContext.AuditLogs.AddAsync(auditEntry, ct);
        await _dbContext.SaveChangesAsync(ct);
        _logger.LogInformation("AuditLog: Đã ghi nhận hành vi xem bằng chứng chat cho Dispute #{DisputeId} bởi Admin {AdminUserId}", disputeId, adminUserId);

        var conversation = await _dbContext.Conversations
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.JobId == dispute.JobId ||
                ((c.UserAId == dispute.StudentId && c.UserBId == dispute.EmployerId) ||
                 (c.UserAId == dispute.EmployerId && c.UserBId == dispute.StudentId)), ct);

        var messagesDto = new List<ChatMessageDto>();
        var conversationId = 0;

        if (conversation != null)
        {
            conversationId = conversation.Id;
            var messages = await _dbContext.ChatMessages
                .AsNoTracking()
                .Include(m => m.Sender)
                .Where(m => m.ConversationId == conversation.Id)
                .OrderBy(m => m.SentAt)
                .ToListAsync(ct);

            messagesDto = messages.Select(m => new ChatMessageDto
            {
                Id = m.Id,
                ConversationId = m.ConversationId,
                SenderId = m.SenderId,
                SenderName = m.Sender?.FullName ?? "Unknown",
                SenderAvatar = m.Sender?.AvatarUrl,
                MessageText = m.MessageText,
                AttachmentUrl = m.AttachmentUrl,
                AttachmentType = m.AttachmentType,
                SentAt = m.SentAt,
                IsMine = false
            }).ToList();
        }

        return new DisputeChatEvidenceDto
        {
            DisputeId = dispute.Id,
            JobId = dispute.JobId,
            JobTitle = dispute.Job?.Title ?? "Dự án liên kết",
            DisputeStatus = dispute.Status ?? "open",
            DisputeReason = dispute.Reason ?? string.Empty,
            StudentId = dispute.StudentId,
            StudentName = dispute.Student?.FullName ?? "Sinh viên",
            EmployerId = dispute.EmployerId,
            EmployerName = dispute.Employer?.FullName ?? "Nhà tuyển dụng",
            ConversationId = conversationId,
            EvidenceAccessLoggedAt = now,
            Messages = messagesDto
        };
    }

    private async Task<DisputeEvidence> SaveEvidenceFileAsync(int disputeId, int userId, Stream stream, string fileName, string contentType, string? description, CancellationToken ct)
    {
        var ext = Path.GetExtension(fileName);
        var safeFileName = $"dispute_{disputeId}_{Guid.NewGuid():N}{ext}";

        var uploadResult = await _storageService.UploadStreamAsync(stream, safeFileName, contentType, $"disputes/{disputeId}", ct);

        var evidence = new DisputeEvidence
        {
            DisputeId = disputeId,
            SubmittedBy = userId,
            FileUrl = uploadResult.FileUrl,
            FileType = contentType ?? "application/octet-stream",
            EvidenceText = description?.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        await _dbContext.DisputeEvidences.AddAsync(evidence, ct);
        await _dbContext.SaveChangesAsync(ct);
        return evidence;
    }

    private async Task<DisputeDto> MapToDisputeDtoAsync(Dispute dispute, CancellationToken ct)
    {
        var d = await _dbContext.Disputes
            .AsNoTracking()
            .Include(x => x.Job)
            .Include(x => x.Student)
            .Include(x => x.Employer)
            .Include(x => x.ResolvedByNavigation)
            .Include(x => x.DisputeEvidences)
            .FirstOrDefaultAsync(x => x.Id == dispute.Id, ct);

        return MapEntityToDto(d ?? dispute, DateTime.UtcNow);
    }

    private static DisputeDto MapEntityToDto(Dispute d, DateTime now)
    {
        var deadline = d.FiledAt.AddHours(72);
        return new DisputeDto
        {
            Id = d.Id,
            JobId = d.JobId,
            JobTitle = d.Job?.Title ?? $"Công việc #{d.JobId}",
            StudentId = d.StudentId,
            StudentName = d.Student?.FullName ?? "Sinh viên",
            EmployerId = d.EmployerId,
            EmployerName = d.Employer?.FullName ?? "Nhà tuyển dụng",
            DeliverableId = d.DeliverableId,
            Amount = d.Amount,
            FiledBy = d.FiledBy,
            Origin = d.Origin,
            Reason = d.Reason,
            Status = d.Status,
            Decision = d.Decision,
            PayoutAmount = d.PayoutAmount,
            PayoutToRole = d.PayoutToRole,
            ResolvedNote = d.ResolvedNote,
            FiledAt = d.FiledAt,
            DeadlineAt72h = deadline,
            CanSubmitEvidence = d.Status == "open" && now <= deadline,
            ResolvedAt = d.ResolvedAt,
            ResolvedBy = d.ResolvedBy,
            ResolvedByName = d.ResolvedByNavigation?.Name,
            EvidenceCount = d.DisputeEvidences?.Count ?? 0
        };
    }

    private async Task<int> EnsureAdminMemberIdAsync(int adminUserId, CancellationToken ct)
    {
        var adminMember = await _dbContext.AdminTeamMembers
            .FirstOrDefaultAsync(a => a.Id == adminUserId, ct);

        if (adminMember != null) return adminMember.Id;

        var adminUser = await _dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == adminUserId, ct);

        if (adminUser != null)
        {
            adminMember = await _dbContext.AdminTeamMembers
                .FirstOrDefaultAsync(a => a.Email == adminUser.Email, ct);

            if (adminMember == null)
            {
                adminMember = new AdminTeamMember
                {
                    Name = adminUser.FullName ?? "Admin Member",
                    Email = adminUser.Email,
                    RoleId = adminUser.RoleId,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };
                await _dbContext.AdminTeamMembers.AddAsync(adminMember, ct);
                await _dbContext.SaveChangesAsync(ct);
            }

            return adminMember.Id;
        }

        var defaultAdmin = await _dbContext.AdminTeamMembers.FirstOrDefaultAsync(ct);
        if (defaultAdmin != null) return defaultAdmin.Id;

        var newAdmin = new AdminTeamMember
        {
            Name = "System SuperAdmin",
            Email = "admin@skillbridge.vn",
            RoleId = 1,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        await _dbContext.AdminTeamMembers.AddAsync(newAdmin, ct);
        await _dbContext.SaveChangesAsync(ct);
        return newAdmin.Id;
    }
}
