using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Support;
using SkillBridge.Application.Interfaces.Support;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Services.Support;

/// <summary>
/// Cài đặt dịch vụ tiếp nhận và lưu trữ yêu cầu hỗ trợ / khiếu nại từ người dùng
/// </summary>
public class SupportTicketService : ISupportTicketService
{
    private readonly SkillBridgeDbContext _dbContext;
    private readonly ILogger<SupportTicketService> _logger;

    public SupportTicketService(
        SkillBridgeDbContext dbContext,
        ILogger<SupportTicketService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<SupportTicketCreatedResponseDto> CreateTicketAsync(
        CreateSupportTicketDto dto,
        int? authenticatedUserId,
        CancellationToken ct = default)
    {
        if (dto == null)
        {
            throw new BusinessException("Dữ liệu yêu cầu hỗ trợ không được để trống.");
        }

        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var normalizedName = dto.Name.Trim();
        var normalizedSubject = dto.Subject.Trim();
        var normalizedMessage = dto.Message.Trim();
        var normalizedPhone = string.IsNullOrWhiteSpace(dto.Phone) ? "Chưa cung cấp" : dto.Phone.Trim();

        // 1. Lớp phòng thủ Honeypot: Nếu bot tự động điền trường ẩn này, âm thầm hủy bỏ không lưu DB
        if (!string.IsNullOrWhiteSpace(dto.HoneypotTrap))
        {
            _logger.LogWarning("Phát hiện Bot spam ticket qua bẫy Honeypot từ email: {Email}, Subject: '{Subject}'.",
                normalizedEmail, normalizedSubject);

            return new SupportTicketCreatedResponseDto
            {
                TicketId = 0,
                Subject = normalizedSubject,
                Status = "open",
                CreatedAt = DateTime.UtcNow,
                Message = "Yêu cầu hỗ trợ của bạn đã được gửi thành công đến đội ngũ Quản trị SkillBridge!"
            };
        }

        // 2. Lớp phòng thủ chống trùng lặp (Cooldown): Ngăn người dùng hoặc script spam cùng 1 nội dung trong 5 phút
        var recentCutoff = DateTime.UtcNow.AddMinutes(-5);
        var hasRecentDuplicate = await _dbContext.SupportTickets
            .AsNoTracking()
            .AnyAsync(t => t.Subject == normalizedSubject &&
                           t.Description.Contains(normalizedMessage) &&
                           t.CreatedAt >= recentCutoff, ct);

        if (hasRecentDuplicate)
        {
            _logger.LogInformation("Chặn gửi ticket trùng lặp từ email {Email} trong vòng 5 phút.", normalizedEmail);
            throw new BusinessException("Yêu cầu này của bạn đã được hệ thống tiếp nhận cách đây ít phút. Vui lòng không gửi lặp lại và đợi phản hồi từ Quản trị viên.");
        }

        int targetUserId;

        if (authenticatedUserId.HasValue)
        {
            var userExists = await _dbContext.Users.AnyAsync(u => u.Id == authenticatedUserId.Value, ct);
            if (userExists)
            {
                targetUserId = authenticatedUserId.Value;
            }
            else
            {
                targetUserId = await ResolveUserIdByEmailOrFallbackAsync(normalizedEmail, ct);
            }
        }
        else
        {
            targetUserId = await ResolveUserIdByEmailOrFallbackAsync(normalizedEmail, ct);
        }

        // Định dạng nội dung chi tiết kèm thông tin liên lạc rõ ràng
        var formattedDescription =
            $"[Thông tin người gửi]\n" +
            $"- Họ và tên: {normalizedName}\n" +
            $"- Email liên hệ: {normalizedEmail}\n" +
            $"- Số điện thoại: {normalizedPhone}\n" +
            $"- Thời gian tiếp nhận: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC\n\n" +
            $"[Nội dung chi tiết]\n" +
            $"{normalizedMessage}";

        var ticket = new SupportTicket
        {
            UserId = targetUserId,
            Subject = normalizedSubject,
            Description = formattedDescription,
            Status = "open",
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.SupportTickets.Add(ticket);
        await _dbContext.SaveChangesAsync(ct);

        _logger.LogInformation("Đã tiếp nhận ticket hỗ trợ #{TicketId} cho người dùng {Email} với chủ đề '{Subject}'.",
            ticket.Id, normalizedEmail, normalizedSubject);

        return new SupportTicketCreatedResponseDto
        {
            TicketId = ticket.Id,
            Subject = ticket.Subject,
            Status = ticket.Status,
            CreatedAt = ticket.CreatedAt,
            Message = "Yêu cầu hỗ trợ của bạn đã được gửi thành công đến đội ngũ Quản trị SkillBridge!"
        };
    }

    private async Task<int> ResolveUserIdByEmailOrFallbackAsync(string email, CancellationToken ct)
    {
        // 1. Thử liên kết với tài khoản đã đăng ký theo email
        var existingUser = await _dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email.ToLower() == email, ct);

        if (existingUser != null)
        {
            return existingUser.Id;
        }

        // 2. Nếu khách vãng lai chưa có tài khoản, gán vào tài khoản đại diện đầu tiên trong hệ thống
        var fallbackUser = await _dbContext.Users
            .AsNoTracking()
            .OrderBy(u => u.Id)
            .FirstOrDefaultAsync(ct);

        if (fallbackUser != null)
        {
            return fallbackUser.Id;
        }

        throw new BusinessException("Không tìm thấy người dùng phù hợp trong hệ thống để tiếp nhận yêu cầu.");
    }
}
