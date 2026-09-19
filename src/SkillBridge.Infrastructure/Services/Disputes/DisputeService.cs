using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Chat;
using SkillBridge.Application.DTOs.Disputes;
using SkillBridge.Application.Interfaces.Disputes;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Services.Disputes;

public class DisputeService : IDisputeService
{
    private readonly SkillBridgeDbContext _dbContext;
    private readonly ILogger<DisputeService> _logger;

    public DisputeService(SkillBridgeDbContext dbContext, ILogger<DisputeService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    /**
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-011
     */
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

        // Cưỡng chế ABAC theo REQ-CHAT-011: Chỉ cho phép xem khi Dispute đang mở ('open')
        var status = dispute.Status?.ToLowerInvariant();
        if (status != "open")
        {
            _logger.LogWarning("Admin {AdminUserId} cố gắng xem bằng chứng chat cho Dispute {DisputeId} khi trạng thái là {Status}", adminUserId, disputeId, status);
            throw new UnauthorizedAccessException("Chỉ được phép xem bằng chứng tin nhắn đối với tranh chấp đang ở trạng thái mở (open).");
        }

        // Đảm bảo có Actor Admin để ghi vào audit_log
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

        // Tìm kiếm cuộc hội thoại tương ứng với JobId hoặc giữa 2 bên
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

    private async Task<int> EnsureAdminMemberIdAsync(int adminUserId, CancellationToken ct)
    {
        var adminMember = await _dbContext.AdminTeamMembers
            .FirstOrDefaultAsync(a => a.Id == adminUserId, ct);

        if (adminMember != null)
        {
            return adminMember.Id;
        }

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

        // Fallback: nếu không tìm thấy thì lấy admin member đầu tiên có sẵn trong db
        var defaultAdmin = await _dbContext.AdminTeamMembers.FirstOrDefaultAsync(ct);
        if (defaultAdmin != null)
        {
            return defaultAdmin.Id;
        }

        // Tạo 1 admin mặc định để audit_log không bị lỗi foreign key
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
