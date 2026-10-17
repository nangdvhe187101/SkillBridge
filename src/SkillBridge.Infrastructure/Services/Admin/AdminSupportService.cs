using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Admin;
using SkillBridge.Application.Interfaces;
using SkillBridge.Application.Interfaces.Admin;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Services.Admin;

/// <summary>
/// Cài đặt dịch vụ Quản trị Hỗ trợ Người dùng (Tickets) & Tra cứu Nhật ký Kiểm toán (Audit Logs)
/// </summary>
public class AdminSupportService : IAdminSupportService
{
    private readonly SkillBridgeDbContext _dbContext;
    private readonly ILogger<AdminSupportService> _logger;
    private readonly ISystemSettingService? _systemSettingService;
    private readonly IEmailService? _emailService;

    public AdminSupportService(
        SkillBridgeDbContext dbContext,
        ILogger<AdminSupportService> logger,
        ISystemSettingService? systemSettingService = null,
        IEmailService? emailService = null)
    {
        _dbContext = dbContext;
        _logger = logger;
        _systemSettingService = systemSettingService;
        _emailService = emailService;
    }

    /// <inheritdoc />
    public async Task<AdminTicketPagedResultDto> GetTicketsAsync(
        string? searchTerm,
        string? status,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;

        var baseQuery = _dbContext.SupportTickets
            .Include(t => t.User)
            .Include(t => t.ResolvedByNavigation)
            .AsNoTracking();

        // Đếm tổng quan trước khi áp dụng bộ lọc trạng thái
        var openCount = await _dbContext.SupportTickets.CountAsync(t => t.Status == "open", ct);
        var resolvedCount = await _dbContext.SupportTickets.CountAsync(t => t.Status == "resolved", ct);

        if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "all", StringComparison.OrdinalIgnoreCase))
        {
            var normalizedStatus = status.Trim().ToLowerInvariant();
            baseQuery = baseQuery.Where(t => t.Status == normalizedStatus);
        }

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLowerInvariant();
            baseQuery = baseQuery.Where(t =>
                t.Subject.ToLower().Contains(term) ||
                t.Description.ToLower().Contains(term) ||
                t.User.FullName.ToLower().Contains(term) ||
                t.User.Email.ToLower().Contains(term));
        }

        var totalCount = await baseQuery.CountAsync(ct);
        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

        var tickets = await baseQuery
            .OrderBy(t => t.Status == "open" ? 0 : 1)
            .ThenByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var items = tickets.Select(MapToTicketDto).ToList();

        return new AdminTicketPagedResultDto
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            TotalPages = totalPages,
            OpenCount = openCount,
            ResolvedCount = resolvedCount
        };
    }

    /// <inheritdoc />
    public async Task<AdminTicketItemDto?> GetTicketDetailAsync(int ticketId, CancellationToken ct = default)
    {
        var ticket = await _dbContext.SupportTickets
            .Include(t => t.User)
            .Include(t => t.ResolvedByNavigation)
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == ticketId, ct);

        if (ticket == null) return null;

        var dto = MapToTicketDto(ticket);

        // Truy xuất các lịch sử phản hồi liên quan trong AuditLog
        var logKeyword = $"ticket #{ticketId}";
        var relatedLogs = await _dbContext.AuditLogs
            .Include(a => a.Actor)
            .Where(a => a.ActionText.Contains(logKeyword))
            .OrderBy(a => a.CreatedAt)
            .AsNoTracking()
            .ToListAsync(ct);

        foreach (var log in relatedLogs)
        {
            dto.Replies.Add(new AdminTicketReplyDto
            {
                Sender = log.Actor?.Name ?? "Quản trị viên",
                Text = log.ActionText,
                Time = log.CreatedAt.ToString("dd/MM/yyyy HH:mm")
            });
        }

        return dto;
    }

    /// <inheritdoc />
    public async Task<AdminTicketItemDto> ReplyAndResolveTicketAsync(
        int ticketId,
        int adminUserId,
        AdminResolveTicketDto dto,
        CancellationToken ct = default)
    {
        var ticket = await _dbContext.SupportTickets
            .Include(t => t.User)
            .Include(t => t.ResolvedByNavigation)
            .FirstOrDefaultAsync(t => t.Id == ticketId, ct);

        if (ticket == null)
        {
            throw new BusinessException($"Không tìm thấy ticket hỗ trợ #{ticketId} trên hệ thống.");
        }

        var adminMember = await GetOrCreateAdminMemberAsync(adminUserId, ct);

        // 1. Nếu có phản hồi, tạo thông báo Notification gửi cho User và ghi log
        if (!string.IsNullOrWhiteSpace(dto.ReplyMessage))
        {
            var replyMsg = dto.ReplyMessage.Trim();

            var notification = new Notification
            {
                UserId = ticket.UserId,
                Icon = "🎫",
                MessageText = $"Phản hồi ticket #{ticket.Id}: {replyMsg}",
                Link = "/support",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            await _dbContext.Notifications.AddAsync(notification, ct);

            await RecordAuditLogAsync(adminMember.Id, $"Admin {adminMember.Name} đã gửi phản hồi cho ticket #{ticket.Id}: {replyMsg}", ct);
        }

        // 2. Nếu đóng ticket
        if (dto.CloseTicket)
        {
            ticket.Status = "resolved";
            ticket.ResolvedBy = adminMember.Id;
            ticket.ResolvedAt = DateTime.UtcNow;

            await RecordAuditLogAsync(adminMember.Id, $"Admin {adminMember.Name} đã giải quyết và đóng ticket hỗ trợ #{ticket.Id}.", ct);
        }

        await _dbContext.SaveChangesAsync(ct);
        _logger.LogInformation("Admin {AdminName} đã cập nhật ticket #{TicketId} (Close: {CloseTicket})", adminMember.Name, ticketId, dto.CloseTicket);

        // 3. Gửi email thông báo phản hồi CSKH trực tiếp cho người dùng nếu có nội dung phản hồi hoặc đóng ticket
        if (!string.IsNullOrWhiteSpace(dto.ReplyMessage) || dto.CloseTicket)
        {
            _ = SendTicketReplyEmailAsync(ticket, dto.ReplyMessage?.Trim(), dto.CloseTicket, adminMember.Name, ct);
        }

        return MapToTicketDto(ticket);
    }

    /// <inheritdoc />
    public async Task<AdminAuditLogPagedResultDto> GetAuditLogsAsync(
        string? searchTerm,
        int? actorId,
        DateTime? fromDate,
        DateTime? toDate,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;

        // Bất biến (INV-SEC-03): Chỉ đọc với AsNoTracking
        var query = _dbContext.AuditLogs
            .Include(a => a.Actor)
            .AsNoTracking();

        if (actorId.HasValue && actorId.Value > 0)
        {
            query = query.Where(a => a.ActorId == actorId.Value);
        }

        if (fromDate.HasValue)
        {
            query = query.Where(a => a.CreatedAt >= fromDate.Value);
        }

        if (toDate.HasValue)
        {
            query = query.Where(a => a.CreatedAt <= toDate.Value);
        }

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLowerInvariant();
            query = query.Where(a =>
                a.ActionText.ToLower().Contains(term) ||
                (a.Actor != null && (a.Actor.Name.ToLower().Contains(term) || a.Actor.Email.ToLower().Contains(term))));
        }

        var totalCount = await query.CountAsync(ct);
        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

        var logs = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var items = logs.Select(l => new AdminAuditLogItemDto
        {
            Id = l.Id,
            ActorId = l.ActorId,
            ActorName = l.Actor?.Name ?? "Hệ thống",
            ActorEmail = l.Actor?.Email ?? "system@skillbridge.vn",
            ActionText = l.ActionText,
            CreatedAt = l.CreatedAt,
            FormattedTime = l.CreatedAt.ToString("dd/MM/yyyy HH:mm:ss")
        }).ToList();

        return new AdminAuditLogPagedResultDto
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            TotalPages = totalPages
        };
    }

    private static AdminTicketItemDto MapToTicketDto(SupportTicket ticket)
    {
        return new AdminTicketItemDto
        {
            Id = ticket.Id,
            UserId = ticket.UserId,
            UserName = ticket.User?.FullName ?? "Người dùng",
            UserEmail = ticket.User?.Email ?? "user@skillbridge.vn",
            Subject = ticket.Subject,
            Description = ticket.Description,
            Status = ticket.Status,
            ResolvedBy = ticket.ResolvedBy,
            ResolverName = ticket.ResolvedByNavigation?.Name,
            ResolvedAt = ticket.ResolvedAt,
            CreatedAt = ticket.CreatedAt,
            Priority = CalculatePriority(ticket.Subject, ticket.Description)
        };
    }

    private static string CalculatePriority(string subject, string description)
    {
        var text = (subject + " " + description).ToLowerInvariant();
        if (text.Contains("gấp") || text.Contains("lừa đảo") || text.Contains("mất tiền") ||
            text.Contains("bị khóa") || text.Contains("urgent") || text.Contains("hack"))
        {
            return "high";
        }
        if (text.Contains("hỏi") || text.Contains("thắc mắc") || text.Contains("hướng dẫn"))
        {
            return "low";
        }
        return "medium";
    }

    private async Task<AdminTeamMember> GetOrCreateAdminMemberAsync(int adminUserId, CancellationToken ct)
    {
        var adminUser = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == adminUserId, ct);
        if (adminUser != null)
        {
            var existing = await _dbContext.AdminTeamMembers.FirstOrDefaultAsync(a => a.Email == adminUser.Email, ct);
            if (existing != null) return existing;

            var newMember = new AdminTeamMember
            {
                Name = adminUser.FullName ?? "Quản trị viên",
                Email = adminUser.Email,
                RoleId = 1,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            await _dbContext.AdminTeamMembers.AddAsync(newMember, ct);
            await _dbContext.SaveChangesAsync(ct);
            return newMember;
        }

        var defaultAdmin = await _dbContext.AdminTeamMembers.FirstOrDefaultAsync(ct);
        if (defaultAdmin != null) return defaultAdmin;

        var fallback = new AdminTeamMember
        {
            Name = "Quản trị viên",
            Email = "admin@skillbridge.vn",
            RoleId = 1,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        await _dbContext.AdminTeamMembers.AddAsync(fallback, ct);
        await _dbContext.SaveChangesAsync(ct);
        return fallback;
    }

    private async Task RecordAuditLogAsync(int actorId, string actionText, CancellationToken ct)
    {
        try
        {
            var log = new AuditLog
            {
                ActorId = actorId,
                ActionText = actionText,
                CreatedAt = DateTime.UtcNow
            };
            await _dbContext.AuditLogs.AddAsync(log, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Không thể ghi nhật ký AuditLog: {ActionText}", actionText);
        }
    }

    private async Task SendTicketReplyEmailAsync(SupportTicket ticket, string? replyMessage, bool isClosed, string adminName, CancellationToken ct)
    {
        try
        {
            if (_emailService == null || _systemSettingService == null) return;
            var isEnabled = await _systemSettingService.IsFeatureEnabledAsync(SystemSettingService.KeyEmailTicketReply, true, ct);
            if (!isEnabled) return;

            var user = ticket.User ?? await _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == ticket.UserId, ct);
            if (user == null || string.IsNullOrWhiteSpace(user.Email)) return;

            var statusBadge = isClosed ? "Đã giải quyết & Đóng ticket" : "Đang tiếp tục hỗ trợ";
            var statusColor = isClosed ? "#10b981" : "#3b82f6";
            var replyContent = string.IsNullOrWhiteSpace(replyMessage)
                ? (isClosed ? "Yêu cầu hỗ trợ của bạn đã được tiếp nhận và xử lý hoàn tất." : "Đội ngũ CSKH đang kiểm tra và xử lý yêu cầu của bạn.")
                : replyMessage;

            var subject = $"[SkillBridge CSKH] Phản hồi yêu cầu hỗ trợ #{ticket.Id}: \"{ticket.Subject}\"";
            var body = $@"
<div style=""font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;"">
    <div style=""background: #2563eb; color: #ffffff; padding: 20px; text-align: center;"">
        <h2 style=""margin: 0; font-size: 20px;"">Trung tâm Trợ giúp & CSKH SkillBridge</h2>
        <p style=""margin: 5px 0 0; font-size: 13px; opacity: 0.9;"">Phản hồi yêu cầu hỗ trợ trực tuyến</p>
    </div>
    <div style=""padding: 24px;"">
        <p>Xin chào <strong>{user.FullName ?? "bạn"}</strong>,</p>
        <p>Bộ phận Chăm sóc Khách hàng của <strong>SkillBridge</strong> đã xem xét và gửi phản hồi cho yêu cầu hỗ trợ của bạn:</p>

        <div style=""background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px; margin: 16px 0;"">
            <p style=""margin: 0 0 6px;""><strong>Mã Ticket:</strong> #{ticket.Id}</p>
            <p style=""margin: 0 0 6px;""><strong>Chủ đề:</strong> {ticket.Subject}</p>
            <p style=""margin: 0 0 6px;""><strong>Trạng thái:</strong> <span style=""color: {statusColor}; font-weight: bold;"">{statusBadge}</span></p>
            <p style=""margin: 0;""><strong>Nội dung phản ánh ban đầu:</strong> <span style=""color: #6b7280;"">{ticket.Description}</span></p>
        </div>

        <div style=""background: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; border-radius: 4px; margin: 20px 0;"">
            <h4 style=""margin: 0 0 8px; color: #1e40af;"">💬 Phản hồi từ Quản trị viên ({adminName}):</h4>
            <p style=""margin: 0; color: #1e293b; white-space: pre-line;"">{replyContent}</p>
        </div>

        <p style=""font-size: 13px; color: #4b5563;"">Nếu bạn vẫn cần trợ giúp thêm hoặc có câu hỏi liên quan, vui lòng phản hồi lại email này hoặc liên hệ hotline hỗ trợ của SkillBridge.</p>
        <hr style=""border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;"" />
        <p style=""font-size: 12px; color: #9ca3af; text-align: center; margin: 0;"">&copy; SkillBridge Customer Support Team. Trân trọng cảm ơn bạn đã đồng hành cùng SkillBridge!</p>
    </div>
</div>";

            await _emailService.SendEmailAsync(user.Email, subject, body, ct);
            _logger.LogInformation("Đã gửi email phản hồi ticket #{TicketId} tới {UserEmail}", ticket.Id, user.Email);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi gửi email phản hồi ticket #{TicketId} cho User {UserId}", ticket.Id, ticket.UserId);
        }
    }
}
