using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Admin;
using SkillBridge.Application.Interfaces.Admin;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Services.Admin;

public class AdminMessageService : IAdminMessageService
{
    private readonly SkillBridgeDbContext _dbContext;
    private readonly ILogger<AdminMessageService> _logger;

    // Các từ khóa nhạy cảm / nghi vấn gian lận kéo ngoài sàn (Fraud Detection Keywords)
    private static readonly string[] SuspiciousKeywords =
    {
        "zalo", "telegram", "tele", "viber", "whatsapp",
        "chuyển khoản ngoài", "ck ngoài", "giao dịch ngoài", "bắn tiền riêng",
        "đặt cọc", "cọc trước", "chuyển tiền trước", "nộp phí", "phí giữ chỗ",
        "stk riêng", "tài khoản riêng"
    };

    private static readonly Regex PhonePattern = new(@"\b(0[35789]\d{8})\b", RegexOptions.Compiled);

    public AdminMessageService(SkillBridgeDbContext dbContext, ILogger<AdminMessageService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    private static (bool IsViolation, string? RiskFlag) DetectRisk(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return (false, null);
        var lower = text.ToLowerInvariant();

        foreach (var kw in SuspiciousKeywords)
        {
            if (lower.Contains(kw))
            {
                return (true, $"Nghi vấn giao dịch ngoài sàn (chứa từ khóa: '{kw}')");
            }
        }

        if (PhonePattern.IsMatch(text))
        {
            return (true, "Nghi vấn trao đổi số điện thoại liên lạc riêng ngoài sàn");
        }

        return (false, null);
    }

    public async Task<AdminConversationPagedResultDto> GetConversationsAsync(
        string? query = null,
        string? status = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 20;

        var q = _dbContext.Conversations
            .AsNoTracking()
            .Include(c => c.UserA)
            .Include(c => c.UserB)
            .Include(c => c.Job)
            .Include(c => c.ChatMessages.OrderByDescending(m => m.SentAt).Take(1))
            .AsQueryable();

        var list = await q.ToListAsync(ct);

        // Ánh xạ và nhận diện vi phạm trên từng cuộc hội thoại
        var mapped = list.Select(c =>
        {
            var lastMsg = c.ChatMessages.FirstOrDefault();
            var lastText = lastMsg?.MessageText ?? string.Empty;
            var (isViolation, riskFlag) = DetectRisk(lastText);

            string calculatedStatus;
            if (c.IsReadOnly)
            {
                calculatedStatus = "locked";
            }
            else if (isViolation)
            {
                calculatedStatus = "warned";
            }
            else
            {
                calculatedStatus = "active";
            }

            return new AdminConversationItemDto
            {
                Id = c.Id,
                JobId = c.JobId,
                JobTitle = c.Job?.Title ?? "Trao đổi tự do",
                StudentId = c.UserAId,
                StudentName = c.UserA?.FullName ?? "Sinh viên",
                StudentEmail = c.UserA?.Email ?? "N/A",
                EmployerId = c.UserBId,
                EmployerName = c.UserB?.FullName ?? "Nhà tuyển dụng",
                EmployerEmail = c.UserB?.Email ?? "N/A",
                LastMessage = lastText,
                LastMessageAt = c.LastMessageAt ?? c.CreatedAt,
                Status = calculatedStatus,
                RiskFlag = riskFlag,
                IsReadOnly = c.IsReadOnly,
                ReadOnlyReason = c.ReadOnlyReason,
                MessageCount = c.ChatMessages.Count
            };
        }).ToList();

        // Thống kê KPI
        var totalCount = mapped.Count;
        var warnedCount = mapped.Count(m => m.Status == "warned");
        var activeCount = mapped.Count(m => m.Status == "active");
        var lockedCount = mapped.Count(m => m.Status == "locked");

        // Lọc theo từ khóa tìm kiếm
        if (!string.IsNullOrWhiteSpace(query))
        {
            var kw = query.Trim().ToLowerInvariant();
            mapped = mapped.Where(m =>
                m.StudentName.ToLowerInvariant().Contains(kw) ||
                m.StudentEmail.ToLowerInvariant().Contains(kw) ||
                m.EmployerName.ToLowerInvariant().Contains(kw) ||
                m.EmployerEmail.ToLowerInvariant().Contains(kw) ||
                m.JobTitle.ToLowerInvariant().Contains(kw) ||
                m.LastMessage.ToLowerInvariant().Contains(kw)).ToList();
        }

        // Lọc theo trạng thái
        if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status.Trim(), "all", StringComparison.OrdinalIgnoreCase))
        {
            var targetStatus = status.Trim().ToLowerInvariant();
            mapped = mapped.Where(m => m.Status == targetStatus).ToList();
        }

        var filteredCount = mapped.Count;
        var pagedItems = mapped
            .OrderByDescending(m => m.LastMessageAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return new AdminConversationPagedResultDto
        {
            Items = pagedItems,
            TotalCount = filteredCount,
            WarnedCount = warnedCount,
            ActiveCount = activeCount,
            LockedCount = lockedCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<AdminConversationDetailDto> GetConversationDetailAsync(
        int adminUserId,
        int conversationId,
        CancellationToken ct = default)
    {
        var conversation = await _dbContext.Conversations
            .AsNoTracking()
            .Include(c => c.UserA)
            .Include(c => c.UserB)
            .Include(c => c.Job)
            .Include(c => c.ChatMessages)
                .ThenInclude(m => m.Sender)
            .FirstOrDefaultAsync(c => c.Id == conversationId, ct);

        if (conversation == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy cuộc trò chuyện #{conversationId}.");
        }

        // Tuân thủ Q-006 / Q-015: Ghi nhận AuditLog bất biến khi Quản trị viên truy xuất lịch sử chat đối soát
        await RecordAuditLogAsync(adminUserId, $"Truy xuất lịch sử chat đối soát phòng #{conversationId} (Job: {conversation.Job?.Title ?? "Tự do"}).", ct);

        var messagesDto = conversation.ChatMessages
            .OrderBy(m => m.SentAt)
            .Select(m =>
            {
                var isSystem = m.MessageText != null && m.MessageText.StartsWith("[HỆ THỐNG");
                var (isViolation, _) = DetectRisk(m.MessageText);

                string senderRole;
                if (isSystem)
                {
                    senderRole = "system";
                }
                else if (m.SenderId == conversation.UserAId)
                {
                    senderRole = "student";
                }
                else if (m.SenderId == conversation.UserBId)
                {
                    senderRole = "employer";
                }
                else
                {
                    senderRole = "admin";
                }

                return new AdminChatMessageDto
                {
                    Id = m.Id,
                    SenderId = m.SenderId,
                    SenderName = isSystem ? "Hệ thống SkillBridge" : (m.Sender?.FullName ?? "Người dùng"),
                    SenderRole = senderRole,
                    MessageText = m.MessageText ?? string.Empty,
                    AttachmentUrl = m.AttachmentUrl,
                    AttachmentType = m.AttachmentType,
                    SentAt = m.SentAt,
                    IsSystem = isSystem,
                    IsViolation = isViolation
                };
            }).ToList();

        var lastMsg = messagesDto.LastOrDefault();
        var (hasRisk, riskDesc) = DetectRisk(lastMsg?.MessageText);

        var conversationItem = new AdminConversationItemDto
        {
            Id = conversation.Id,
            JobId = conversation.JobId,
            JobTitle = conversation.Job?.Title ?? "Trao đổi tự do",
            StudentId = conversation.UserAId,
            StudentName = conversation.UserA?.FullName ?? "Sinh viên",
            StudentEmail = conversation.UserA?.Email ?? "N/A",
            EmployerId = conversation.UserBId,
            EmployerName = conversation.UserB?.FullName ?? "Nhà tuyển dụng",
            EmployerEmail = conversation.UserB?.Email ?? "N/A",
            LastMessage = lastMsg?.MessageText ?? string.Empty,
            LastMessageAt = conversation.LastMessageAt ?? conversation.CreatedAt,
            Status = conversation.IsReadOnly ? "locked" : (hasRisk ? "warned" : "active"),
            RiskFlag = riskDesc,
            IsReadOnly = conversation.IsReadOnly,
            ReadOnlyReason = conversation.ReadOnlyReason,
            MessageCount = messagesDto.Count
        };

        return new AdminConversationDetailDto
        {
            Conversation = conversationItem,
            Messages = messagesDto
        };
    }

    public async Task<bool> WarnConversationAsync(
        int adminUserId,
        int conversationId,
        AdminWarnChatDto? dto = null,
        CancellationToken ct = default)
    {
        var conversation = await _dbContext.Conversations.FirstOrDefaultAsync(c => c.Id == conversationId, ct);
        if (conversation == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy cuộc trò chuyện #{conversationId}.");
        }

        var warningText = dto?.Message?.Trim() ??
            "[HỆ THỐNG CẢNH BÁO]: SkillBridge khuyến cáo người dùng không thực hiện giao dịch, chuyển cọc hoặc trao đổi thông tin liên lạc ngoài nền tảng (Zalo/Telegram). Mọi rủi ro ngoài sàn sẽ không được bảo đảm bởi Quỹ Ký Quỹ Escrow và có nguy cơ bị xử lý tài khoản.";

        var now = DateTime.UtcNow;
        var chatMessage = new ChatMessage
        {
            ConversationId = conversationId,
            SenderId = adminUserId,
            MessageText = warningText,
            SentAt = now
        };

        await _dbContext.ChatMessages.AddAsync(chatMessage, ct);
        conversation.LastMessageAt = now;

        await RecordAuditLogAsync(adminUserId, $"Phát cảnh báo gian lận màu cam vào phòng chat #{conversationId}.", ct);
        await _dbContext.SaveChangesAsync(ct);

        _logger.LogInformation("Admin {AdminUserId} đã phát cảnh báo vào cuộc trò chuyện #{ConversationId}.", adminUserId, conversationId);
        return true;
    }

    public async Task<bool> LockConversationAsync(
        int adminUserId,
        int conversationId,
        AdminLockChatDto? dto = null,
        CancellationToken ct = default)
    {
        var conversation = await _dbContext.Conversations.FirstOrDefaultAsync(c => c.Id == conversationId, ct);
        if (conversation == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy cuộc trò chuyện #{conversationId}.");
        }

        var reason = dto?.Reason?.Trim() ?? "Quản trị viên đã khóa cuộc trò chuyện do nghi vấn vi phạm chính sách an toàn.";
        conversation.IsReadOnly = true;
        conversation.ReadOnlyReason = reason;

        var now = DateTime.UtcNow;
        var lockNotificationMsg = new ChatMessage
        {
            ConversationId = conversationId,
            SenderId = adminUserId,
            MessageText = $"[HỆ THỐNG THÔNG BÁO]: Cuộc trò chuyện này đã bị Quản trị viên tạm khóa. Lý do: {reason}.",
            SentAt = now
        };

        await _dbContext.ChatMessages.AddAsync(lockNotificationMsg, ct);
        conversation.LastMessageAt = now;

        await RecordAuditLogAsync(adminUserId, $"Khóa phòng chat #{conversationId}. Lý do: {reason}", ct);
        await _dbContext.SaveChangesAsync(ct);

        _logger.LogInformation("Admin {AdminUserId} đã khóa cuộc trò chuyện #{ConversationId}. Lý do: {Reason}", adminUserId, conversationId, reason);
        return true;
    }

    public async Task<int> SendBroadcastAsync(
        int adminUserId,
        AdminBroadcastDto dto,
        CancellationToken ct = default)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Content))
        {
            throw new BusinessException("Vui lòng cung cấp đầy đủ tiêu đề và nội dung thông báo hệ thống.");
        }

        var userQuery = _dbContext.Users
            .AsNoTracking()
            .Include(u => u.Role)
            .Where(u => u.AccountStatus == "active");

        if (string.Equals(dto.TargetRole, "student", StringComparison.OrdinalIgnoreCase))
        {
            userQuery = userQuery.Where(u => u.Role.Code == "talent" || u.Role.Type == "talent");
        }
        else if (string.Equals(dto.TargetRole, "employer", StringComparison.OrdinalIgnoreCase))
        {
            userQuery = userQuery.Where(u => u.Role.Code == "employer" || u.Role.Type == "employer");
        }

        var targetUsers = await userQuery.Select(u => u.Id).ToListAsync(ct);
        if (targetUsers.Count == 0)
        {
            return 0;
        }

        var now = DateTime.UtcNow;
        var fullMessage = $"{dto.Title.Trim()}: {dto.Content.Trim()}";

        var notifications = targetUsers.Select(userId => new Notification
        {
            UserId = userId,
            Icon = "bell",
            MessageText = fullMessage.Length > 255 ? fullMessage[..252] + "..." : fullMessage,
            Link = "/notifications",
            IsRead = false,
            CreatedAt = now
        }).ToList();

        await _dbContext.Notifications.AddRangeAsync(notifications, ct);
        await RecordAuditLogAsync(adminUserId, $"Phát thông báo broadcast tới {targetUsers.Count} người dùng (Đối tượng: {dto.TargetRole}, Tiêu đề: '{dto.Title}').", ct);
        await _dbContext.SaveChangesAsync(ct);

        _logger.LogInformation("Admin {AdminUserId} đã gửi thông báo broadcast tới {Count} người dùng. Tiêu đề: {Title}",
            adminUserId, targetUsers.Count, dto.Title);

        return targetUsers.Count;
    }

    private async Task RecordAuditLogAsync(int adminUserId, string actionText, CancellationToken ct)
    {
        try
        {
            var adminUser = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == adminUserId, ct);
            if (adminUser == null) return;

            var adminMember = await _dbContext.AdminTeamMembers
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

            var log = new AuditLog
            {
                ActorId = adminMember.Id,
                ActionText = actionText,
                CreatedAt = DateTime.UtcNow
            };
            await _dbContext.AuditLogs.AddAsync(log, ct);
            await _dbContext.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Không thể ghi nhật ký AuditLog: {ActionText}", actionText);
        }
    }
}
