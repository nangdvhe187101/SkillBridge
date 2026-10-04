using System;
using System.Collections.Generic;
using System.Linq;
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

/// <summary>
/// Cài đặt dịch vụ Quản trị Hỗ trợ Người dùng (Tickets) & Tra cứu Nhật ký Kiểm toán (Audit Logs)
/// </summary>
public class AdminSupportService : IAdminSupportService
{
    private readonly SkillBridgeDbContext _dbContext;
    private readonly ILogger<AdminSupportService> _logger;

    public AdminSupportService(
        SkillBridgeDbContext dbContext,
        ILogger<AdminSupportService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
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
}
