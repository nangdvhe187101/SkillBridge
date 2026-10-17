using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Admin;
using SkillBridge.Application.DTOs.Jobs;
using SkillBridge.Application.Interfaces;
using SkillBridge.Application.Interfaces.Payments;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Services.Admin;

public class AdminContractService : IAdminContractService
{
    private readonly SkillBridgeDbContext _dbContext;
    private readonly IEscrowPaymentService _escrowService;
    private readonly ILogger<AdminContractService> _logger;

    public AdminContractService(
        SkillBridgeDbContext dbContext,
        IEscrowPaymentService escrowService,
        ILogger<AdminContractService> logger)
    {
        _dbContext = dbContext;
        _escrowService = escrowService;
        _logger = logger;
    }

    /// <summary>
    /// @ears .sdd/features/feat-contract-escrow-monitor/SPEC.md#REQ-CEM-01
    /// </summary>
    public async Task<AdminContractStatsDto> GetContractStatsAsync()
    {
        var now = DateTime.UtcNow;
        var deadlineThreshold = now.AddDays(-7);
        var reviewThreshold = now.AddHours(-72);

        var activeContractsQuery = _dbContext.Jobs
            .AsNoTracking()
            .Where(j => j.HiredApplicantId != null && (j.Status == "in_progress" || j.Status == "submitted" || j.Status == "revision_requested"));

        var totalActive = await activeContractsQuery.CountAsync();
        var totalEscrow = await activeContractsQuery.SumAsync(j => (decimal?)(j.EscrowAmount ?? j.Budget)) ?? 0m;

        // Quá hạn nghiệm thu: status == submitted và (AutoReleaseAt <= now hoặc có deliverable nộp trước reviewThreshold)
        var slaReviewBreached = await _dbContext.Jobs
            .AsNoTracking()
            .Where(j => j.HiredApplicantId != null && j.Status == "submitted")
            .Where(j => (j.AutoReleaseAt != null && j.AutoReleaseAt <= now)
                     || j.JobDeliverables.Any(d => d.Status == "pending" && d.SubmittedAt <= reviewThreshold))
            .CountAsync();

        // Quá hạn Deadline: status == in_progress và DeadlineAt <= deadlineThreshold
        var slaDeadlineBreached = await _dbContext.Jobs
            .AsNoTracking()
            .Where(j => j.HiredApplicantId != null && j.Status == "in_progress" && j.DeadlineAt != null && j.DeadlineAt <= deadlineThreshold)
            .CountAsync();

        return new AdminContractStatsDto
        {
            TotalActiveContracts = totalActive,
            TotalEscrowLocked = totalEscrow,
            SlaBreachedReviewCount = slaReviewBreached,
            SlaBreachedDeadlineCount = slaDeadlineBreached
        };
    }

    /// <summary>
    /// @ears .sdd/features/feat-contract-escrow-monitor/SPEC.md#REQ-CEM-02
    /// </summary>
    public async Task<PagedResult<AdminContractListItemDto>> GetContractsAsync(
        string? searchTerm,
        string? status,
        int page,
        int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var now = DateTime.UtcNow;
        var deadlineThreshold = now.AddDays(-7);
        var reviewThreshold = now.AddHours(-72);

        var query = _dbContext.Jobs
            .AsNoTracking()
            .Include(j => j.Employer)
            .Include(j => j.HiredApplicant)
            .Include(j => j.JobDeliverables)
            .Where(j => j.HiredApplicantId != null)
            .AsQueryable();

        // Lọc trạng thái thông minh
        if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status.Trim(), "all", StringComparison.OrdinalIgnoreCase))
        {
            var s = status.Trim();
            if (string.Equals(s, "overdue_review", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(j => j.Status == "submitted" &&
                    ((j.AutoReleaseAt != null && j.AutoReleaseAt <= now) ||
                     j.JobDeliverables.Any(d => d.Status == "pending" && d.SubmittedAt <= reviewThreshold)));
            }
            else if (string.Equals(s, "overdue_deadline", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(j => j.Status == "in_progress" && j.DeadlineAt != null && j.DeadlineAt <= deadlineThreshold);
            }
            else
            {
                var lowerStatus = s.ToLowerInvariant();
                query = query.Where(j => j.Status == lowerStatus);
            }
        }

        // Tìm kiếm
        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(j =>
                j.Id.ToString().Contains(term) ||
                j.Title.ToLower().Contains(term) ||
                j.Employer.FullName.ToLower().Contains(term) ||
                j.Employer.Email.ToLower().Contains(term) ||
                (j.HiredApplicant != null && (j.HiredApplicant.FullName.ToLower().Contains(term) || j.HiredApplicant.Email.ToLower().Contains(term)))
            );
        }

        var totalItems = await query.CountAsync();

        var jobs = await query
            .OrderByDescending(j => j.UpdatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = jobs.Select(j =>
        {
            var latestDeliverable = j.JobDeliverables.MaxBy(d => d.SubmittedAt);
            var submittedAt = latestDeliverable?.SubmittedAt;

            var isReviewBreached = j.Status == "submitted" &&
                ((j.AutoReleaseAt != null && j.AutoReleaseAt <= now) || (submittedAt != null && submittedAt <= reviewThreshold));

            var isDeadlineBreached = j.Status == "in_progress" && j.DeadlineAt != null && j.DeadlineAt <= deadlineThreshold;

            int? hoursSinceSubmitted = submittedAt.HasValue ? (int?)(now - submittedAt.Value).TotalHours : null;
            int? daysOverdueDeadline = (j.DeadlineAt.HasValue && j.DeadlineAt.Value < now)
                ? (int?)(now - j.DeadlineAt.Value).TotalDays
                : null;

            var escrowVal = j.EscrowAmount ?? j.Budget;

            return new AdminContractListItemDto
            {
                Id = j.Id,
                Code = $"CT-{j.Id:D4}",
                Title = j.Title,
                Budget = j.Budget,
                EscrowAmount = escrowVal,
                Status = j.Status,
                StudentId = j.HiredApplicantId,
                StudentName = j.HiredApplicant?.FullName ?? "N/A",
                StudentEmail = j.HiredApplicant?.Email ?? "N/A",
                StudentReliability = j.HiredApplicant?.ReliabilityScore ?? 100,
                EmployerId = j.EmployerId,
                EmployerName = j.Employer?.FullName ?? "N/A",
                EmployerEmail = j.Employer?.Email ?? "N/A",
                EmployerReliability = j.Employer?.ReliabilityScore ?? 100,
                PostedAt = j.PostedAt,
                DeadlineAt = j.DeadlineAt,
                SubmittedAt = submittedAt,
                IsSlaReviewBreached = isReviewBreached,
                IsSlaDeadlineBreached = isDeadlineBreached,
                HoursSinceSubmitted = hoursSinceSubmitted,
                DaysOverdueDeadline = daysOverdueDeadline,
                RequiresMakerChecker = escrowVal > 5000000m
            };
        }).ToList();

        return new PagedResult<AdminContractListItemDto>
        {
            Items = items,
            TotalCount = totalItems,
            Page = page,
            PageSize = pageSize
        };
    }

    /// <summary>
    /// @ears .sdd/features/feat-contract-escrow-monitor/SPEC.md#REQ-CEM-03
    /// </summary>
    public async Task<AdminContractDetailDto?> GetContractDetailAsync(int contractId)
    {
        var now = DateTime.UtcNow;
        var deadlineThreshold = now.AddDays(-7);
        var reviewThreshold = now.AddHours(-72);

        var job = await _dbContext.Jobs
            .AsNoTracking()
            .Include(j => j.Employer)
            .Include(j => j.HiredApplicant)
            .Include(j => j.Category)
            .Include(j => j.JobDeliverables)
            .Include(j => j.Conversations)
                .ThenInclude(c => c.ChatMessages)
            .FirstOrDefaultAsync(j => j.Id == contractId);

        if (job == null) return null;

        var latestDeliverable = job.JobDeliverables.MaxBy(d => d.SubmittedAt);
        var submittedAt = latestDeliverable?.SubmittedAt;

        var isReviewBreached = job.Status == "submitted" &&
            ((job.AutoReleaseAt != null && job.AutoReleaseAt <= now) || (submittedAt != null && submittedAt <= reviewThreshold));

        var isDeadlineBreached = job.Status == "in_progress" && job.DeadlineAt != null && job.DeadlineAt <= deadlineThreshold;

        int? hoursSinceSubmitted = submittedAt.HasValue ? (int?)(now - submittedAt.Value).TotalHours : null;
        int? daysOverdueDeadline = (job.DeadlineAt.HasValue && job.DeadlineAt.Value < now)
            ? (int?)(now - job.DeadlineAt.Value).TotalDays
            : null;

        var escrowVal = job.EscrowAmount ?? job.Budget;

        // Trích xuất tin nhắn chat gần nhất
        var recentMessages = job.Conversations
            .SelectMany(c => c.ChatMessages)
            .OrderByDescending(m => m.SentAt)
            .Take(10)
            .Select(m => new AdminContractMessageDto
            {
                Id = m.Id,
                SenderName = m.SenderId == job.EmployerId ? job.Employer.FullName : (job.HiredApplicant?.FullName ?? "Sinh viên"),
                MessageText = m.MessageText ?? "[Tệp tin/Hình ảnh]",
                SentAt = m.SentAt
            })
            .OrderBy(m => m.SentAt)
            .ToList();

        var deliverables = job.JobDeliverables
            .OrderByDescending(d => d.Version)
            .Select(d => new AdminDeliverableItemDto
            {
                Id = d.Id,
                Version = d.Version,
                FileUrl = d.FinalFileUrl ?? d.PreviewFileUrl ?? d.FileName,
                Status = d.Status,
                StudentNotes = d.Note,
                ExternalLink = d.ExternalUrl,
                SubmittedAt = d.SubmittedAt
            })
            .ToList();

        return new AdminContractDetailDto
        {
            Id = job.Id,
            Code = $"CT-{job.Id:D4}",
            Title = job.Title,
            Description = job.Description,
            CategoryName = job.Category?.Name,
            Budget = job.Budget,
            EscrowAmount = escrowVal,
            Status = job.Status,
            StudentId = job.HiredApplicantId,
            StudentName = job.HiredApplicant?.FullName ?? "N/A",
            StudentEmail = job.HiredApplicant?.Email ?? "N/A",
            StudentReliability = job.HiredApplicant?.ReliabilityScore ?? 100,
            EmployerId = job.EmployerId,
            EmployerName = job.Employer?.FullName ?? "N/A",
            EmployerEmail = job.Employer?.Email ?? "N/A",
            EmployerReliability = job.Employer?.ReliabilityScore ?? 100,
            PostedAt = job.PostedAt,
            DeadlineAt = job.DeadlineAt,
            SubmittedAt = submittedAt,
            IsSlaReviewBreached = isReviewBreached,
            IsSlaDeadlineBreached = isDeadlineBreached,
            HoursSinceSubmitted = hoursSinceSubmitted,
            DaysOverdueDeadline = daysOverdueDeadline,
            RequiresMakerChecker = escrowVal > 5000000m,
            Deliverables = deliverables,
            RecentChatMessages = recentMessages
        };
    }

    /// <summary>
    /// @ears .sdd/features/feat-contract-escrow-monitor/SPEC.md#REQ-CEM-04
    /// </summary>
    public async Task<bool> ForceReleaseAsync(int contractId, int adminId, ForceContractActionRequestDto request)
    {
        ValidateSafetyRequest(request);

        var job = await _dbContext.Jobs
            .Include(j => j.Employer)
            .Include(j => j.HiredApplicant)
            .Include(j => j.JobDeliverables)
            .FirstOrDefaultAsync(j => j.Id == contractId);

        if (job == null) throw new BusinessException("Hợp đồng không tồn tại.");
        if (job.HiredApplicantId == null) throw new BusinessException("Hợp đồng chưa có sinh viên nhận việc.");

        if (job.Status == "completed" || job.Status == "cancelled")
        {
            throw new BusinessException("Hợp đồng đã hoàn thành hoặc đã bị hủy trước đó (E-CEM-06).");
        }

        // Bất biến INV-CEM-01: Bắt buộc phải có ít nhất 1 Deliverable
        if (!job.JobDeliverables.Any())
        {
            throw new BusinessException("Sinh viên chưa nộp bất kỳ sản phẩm bàn giao (Deliverable) nào. Không thể giải ngân (INV-CEM-01).");
        }

        var amount = job.EscrowAmount ?? job.Budget;

        // Ngưỡng Maker-Checker (> 5 triệu)
        if (amount > 5000000m)
        {
            // Ghi nhận đề xuất vào AuditLog và tạm hoãn thi hành
            var auditProposal = new AuditLog
            {
                ActorId = adminId,
                ActionText = $"[PROPOSE_FORCE_RELEASE_ESCROW] Maker ID {adminId} đề xuất cưỡng chế giải ngân {amount:N0}đ cho Job #{job.Id}. Lý do: {request.Reason}. Chờ Checker duyệt.",
                CreatedAt = DateTime.UtcNow
            };
            await _dbContext.AuditLogs.AddAsync(auditProposal);
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Admin ID {AdminId} đề xuất cưỡng chế giải ngân hợp đồng #{JobId} > 5M. Đang chờ Checker duyệt.", adminId, job.Id);
            return true;
        }

        // Thực thi giải ngân trực tiếp (<= 5 triệu) trong Transaction
        using var tx = await _dbContext.Database.BeginTransactionAsync();
        try
        {
            await _escrowService.ReleaseEscrowAsync(
                studentId: job.HiredApplicantId.Value,
                employerId: job.EmployerId,
                jobId: job.Id,
                jobTitle: job.Title,
                amount: amount);

            StateMachineValidator.ValidateJobTransition(job.Status, "completed");
            job.Status = "completed";
            job.UpdatedAt = DateTime.UtcNow;

            // Tự động trừ 10 điểm uy tín NTD (REQ-CEM-04, DT-CEM-01)
            if (job.Employer != null)
            {
                job.Employer.ReliabilityScore = Math.Max(0, job.Employer.ReliabilityScore - 10);
            }

            // Ghi AuditLog bất biến (INV-CEM-03)
            var audit = new AuditLog
            {
                ActorId = adminId,
                ActionText = $"[FORCE_RELEASE_ESCROW] Cưỡng chế giải ngân {amount:N0}đ cho SV {job.HiredApplicant?.FullName} (Job #{job.Id}). Lý do: {request.Reason}",
                CreatedAt = DateTime.UtcNow
            };
            await _dbContext.AuditLogs.AddAsync(audit);

            await _dbContext.SaveChangesAsync();
            await tx.CommitAsync();

            _logger.LogInformation("Admin ID {AdminId} cưỡng chế giải ngân thành công cho Job #{JobId}.", adminId, job.Id);
            return true;
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync();
            _logger.LogError(ex, "Lỗi khi cưỡng chế giải ngân Job #{JobId}", job.Id);
            throw;
        }
    }

    /// <summary>
    /// @ears .sdd/features/feat-contract-escrow-monitor/SPEC.md#REQ-CEM-05
    /// </summary>
    public async Task<bool> ForceRefundAsync(int contractId, int adminId, ForceContractActionRequestDto request)
    {
        ValidateSafetyRequest(request);

        var job = await _dbContext.Jobs
            .Include(j => j.Employer)
            .Include(j => j.HiredApplicant)
            .FirstOrDefaultAsync(j => j.Id == contractId);

        if (job == null) throw new BusinessException("Hợp đồng không tồn tại.");
        if (job.Status == "completed" || job.Status == "cancelled")
        {
            throw new BusinessException("Hợp đồng đã hoàn thành hoặc đã bị hủy trước đó (E-CEM-06).");
        }

        var amount = job.EscrowAmount ?? job.Budget;

        // Ngưỡng Maker-Checker (> 5 triệu)
        if (amount > 5000000m)
        {
            var auditProposal = new AuditLog
            {
                ActorId = adminId,
                ActionText = $"[PROPOSE_FORCE_REFUND_ESCROW] Maker ID {adminId} đề xuất cưỡng chế hoàn cọc {amount:N0}đ cho Job #{job.Id}. Lý do: {request.Reason}. Chờ Checker duyệt.",
                CreatedAt = DateTime.UtcNow
            };
            await _dbContext.AuditLogs.AddAsync(auditProposal);
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Admin ID {AdminId} đề xuất cưỡng chế hoàn cọc hợp đồng #{JobId} > 5M. Đang chờ Checker duyệt.", adminId, job.Id);
            return true;
        }

        using var tx = await _dbContext.Database.BeginTransactionAsync();
        try
        {
            await _escrowService.RefundEscrowAsync(
                employerId: job.EmployerId,
                jobId: job.Id,
                jobTitle: job.Title,
                amount: amount,
                reason: $"Admin cưỡng chế hoàn cọc: {request.Reason}");

            StateMachineValidator.ValidateJobTransition(job.Status, "cancelled");
            job.Status = "cancelled";
            job.UpdatedAt = DateTime.UtcNow;

            // Tự động trừ 15 điểm uy tín SV (REQ-CEM-05, DT-CEM-01)
            if (job.HiredApplicant != null)
            {
                job.HiredApplicant.ReliabilityScore = Math.Max(0, job.HiredApplicant.ReliabilityScore - 15);
            }

            // Ghi AuditLog bất biến
            var audit = new AuditLog
            {
                ActorId = adminId,
                ActionText = $"[FORCE_REFUND_ESCROW] Cưỡng chế hoàn cọc {amount:N0}đ cho NTD {job.Employer?.FullName} (Job #{job.Id}). Lý do: {request.Reason}",
                CreatedAt = DateTime.UtcNow
            };
            await _dbContext.AuditLogs.AddAsync(audit);

            await _dbContext.SaveChangesAsync();
            await tx.CommitAsync();

            _logger.LogInformation("Admin ID {AdminId} cưỡng chế hoàn cọc thành công cho Job #{JobId}.", adminId, job.Id);
            return true;
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync();
            _logger.LogError(ex, "Lỗi khi cưỡng chế hoàn cọc Job #{JobId}", job.Id);
            throw;
        }
    }

    /// <summary>
    /// @ears .sdd/features/feat-contract-escrow-monitor/SPEC.md#REQ-CEM-06
    /// </summary>
    public async Task<bool> ApproveCheckerAsync(int contractId, int checkerAdminId)
    {
        // Tìm đề xuất gần nhất trong AuditLog để lấy MakerId
        var proposal = await _dbContext.AuditLogs
            .Where(a => a.ActionText.Contains($"Job #{contractId}") &&
                       (a.ActionText.Contains("[PROPOSE_FORCE_RELEASE_ESCROW]") || a.ActionText.Contains("[PROPOSE_FORCE_REFUND_ESCROW]")))
            .OrderByDescending(a => a.CreatedAt)
            .FirstOrDefaultAsync();

        if (proposal == null)
        {
            throw new BusinessException($"Không tìm thấy yêu cầu chờ phê duyệt cấp 2 cho hợp đồng #{contractId}.");
        }

        // Bất biến INV-CEM-02 / INV-ADM-02: Cấm Checker trùng Maker
        if (proposal.ActorId == checkerAdminId)
        {
            throw new BusinessException("Bạn không thể tự phê duyệt lệnh cưỡng chế do chính mình đề xuất (E-CEM-05: Maker = Checker).");
        }

        var isRelease = proposal.ActionText.Contains("[PROPOSE_FORCE_RELEASE_ESCROW]");
        var dummyRequest = new ForceContractActionRequestDto
        {
            ConfirmPhrase = "XAC NHAN",
            Reason = $"Đã duyệt bởi Checker ID {checkerAdminId} (Kế thừa đề xuất Maker ID {proposal.ActorId})"
        };

        var job = await _dbContext.Jobs
            .Include(j => j.Employer)
            .Include(j => j.HiredApplicant)
            .FirstOrDefaultAsync(j => j.Id == contractId);

        if (job == null) throw new BusinessException("Hợp đồng không tồn tại.");
        var amount = job.EscrowAmount ?? job.Budget;

        using var tx = await _dbContext.Database.BeginTransactionAsync();
        try
        {
            if (isRelease)
            {
                await _escrowService.ReleaseEscrowAsync(job.HiredApplicantId!.Value, job.EmployerId, job.Id, job.Title, amount);
                StateMachineValidator.ValidateJobTransition(job.Status, "completed");
                job.Status = "completed";
                if (job.Employer != null) job.Employer.ReliabilityScore = Math.Max(0, job.Employer.ReliabilityScore - 10);
            }
            else
            {
                await _escrowService.RefundEscrowAsync(job.EmployerId, job.Id, job.Title, amount, dummyRequest.Reason);
                StateMachineValidator.ValidateJobTransition(job.Status, "cancelled");
                job.Status = "cancelled";
                if (job.HiredApplicant != null) job.HiredApplicant.ReliabilityScore = Math.Max(0, job.HiredApplicant.ReliabilityScore - 15);
            }

            job.UpdatedAt = DateTime.UtcNow;

            var checkerAudit = new AuditLog
            {
                ActorId = checkerAdminId,
                ActionText = $"[CHECKER_APPROVED] Checker ID {checkerAdminId} phê duyệt cấp 2 cho Maker ID {proposal.ActorId} Job #{job.Id}. Thực thi {(isRelease ? "giải ngân" : "hoàn cọc")} {amount:N0}đ thành công.",
                CreatedAt = DateTime.UtcNow
            };
            await _dbContext.AuditLogs.AddAsync(checkerAudit);

            await _dbContext.SaveChangesAsync();
            await tx.CommitAsync();

            _logger.LogInformation("Checker ID {CheckerId} đã phê duyệt thành công hợp đồng #{JobId}.", checkerAdminId, job.Id);
            return true;
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync();
            _logger.LogError(ex, "Lỗi khi Checker phê duyệt Job #{JobId}", job.Id);
            throw;
        }
    }

    private static void ValidateSafetyRequest(ForceContractActionRequestDto request)
    {
        if (request == null) throw new BusinessException("Dữ liệu yêu cầu không hợp lệ.");
        if (string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Trim().Length < 10)
        {
            throw new BusinessException("Lý do can thiệp bắt buộc tối thiểu 10 ký tự (E-CEM-03).");
        }
        if (request.ConfirmPhrase?.Trim() != "XAC NHAN")
        {
            throw new BusinessException("Mã xác nhận an toàn không chính xác (yêu cầu gõ 'XAC NHAN') (E-CEM-04).");
        }
    }
}
