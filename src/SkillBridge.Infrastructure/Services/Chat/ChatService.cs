using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Chat;
using SkillBridge.Application.DTOs.Jobs;
using SkillBridge.Application.Interfaces.Chat;
using SkillBridge.Application.Interfaces.Storage;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Services.Chat;

public class ChatService : IChatService
{
    private readonly SkillBridgeDbContext _dbContext;
    private readonly IChatRealtimeNotifier _realtimeNotifier;
    private readonly IStorageService _storageService;
    private readonly IUserPresenceService _presenceService;
    private readonly ILogger<ChatService> _logger;

    private static readonly HashSet<string> DisallowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".exe", ".bat", ".sh", ".cmd", ".js", ".msi", ".vbs", ".scr", ".pif", ".application", ".gadget"
    };

    public ChatService(
        SkillBridgeDbContext dbContext,
        IChatRealtimeNotifier realtimeNotifier,
        IStorageService storageService,
        IUserPresenceService presenceService,
        ILogger<ChatService> logger)
    {
        _dbContext = dbContext;
        _realtimeNotifier = realtimeNotifier;
        _storageService = storageService;
        _presenceService = presenceService;
        _logger = logger;
    }

    /**
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-001
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-004
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-010
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-012
     */
    public async Task<List<ConversationDto>> GetConversationsAsync(int currentUserId, string? tab = null, CancellationToken ct = default)
    {
        var query = _dbContext.Conversations
            .AsNoTracking()
            .Where(c => c.UserAId == currentUserId || c.UserBId == currentUserId);

        // Lọc bỏ các hội thoại đã lưu trữ (Archived) của người dùng hiện tại
        query = query.Where(c => (c.UserAId == currentUserId && !c.IsArchivedUserA) ||
                                 (c.UserBId == currentUserId && !c.IsArchivedUserB));

        // Phân tách Tab theo REQ-CHAT-012:
        // - "request": Các yêu cầu đang chờ (pending) mà người gửi là đối phương (người nhận là currentUserId)
        // - "chat" (hoặc null): Các cuộc hội thoại chính thức (active) HOẶC yêu cầu do chính currentUserId gửi đi
        if (string.Equals(tab, "request", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(c => c.RequestStatus == "pending" && c.RequestInitiatedBy != currentUserId);
        }
        else
        {
            query = query.Where(c => c.RequestStatus == "active" ||
                                    (c.RequestStatus == "pending" && c.RequestInitiatedBy == currentUserId));
        }

        var conversations = await query
            .Include(c => c.UserA).ThenInclude(u => u.Role)
            .Include(c => c.UserB).ThenInclude(u => u.Role)
            .Include(c => c.Job)
            .OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
            .ToListAsync(ct);

        if (conversations.Count == 0)
        {
            return new List<ConversationDto>();
        }

        var conversationIds = conversations.Select(c => c.Id).ToList();
        var otherUserIds = conversations
            .Select(c => c.UserAId == currentUserId ? c.UserBId : c.UserAId)
            .Distinct()
            .ToList();

        // Lấy thống kê đánh giá thật của các đối tác
        var reviewsData = await _dbContext.Reviews
            .AsNoTracking()
            .Where(r => otherUserIds.Contains(r.RevieweeId))
            .GroupBy(r => r.RevieweeId)
            .Select(g => new
            {
                UserId = g.Key,
                AvgRating = g.Average(r => (double)r.Stars),
                Count = g.Count()
            })
            .ToListAsync(ct);

        var reviewDict = reviewsData.ToDictionary(r => r.UserId, r => (Avg: Math.Round(r.AvgRating, 1), Count: r.Count));

        // Lấy tin nhắn cuối cùng của từng hội thoại để hiển thị preview
        var lastMessages = await _dbContext.ChatMessages
            .AsNoTracking()
            .Where(m => conversationIds.Contains(m.ConversationId))
            .GroupBy(m => m.ConversationId)
            .Select(g => g.OrderByDescending(m => m.SentAt).FirstOrDefault())
            .ToListAsync(ct);

        var lastMessageDict = lastMessages
            .Where(m => m != null)
            .ToDictionary(m => m!.ConversationId, m => m!);

        var result = new List<ConversationDto>(conversations.Count);

        foreach (var c in conversations)
        {
            reviewDict.TryGetValue(c.UserAId == currentUserId ? c.UserBId : c.UserAId, out var userReview);
            lastMessageDict.TryGetValue(c.Id, out var lastMsg);

            result.Add(MapToDto(c, currentUserId, userReview.Count > 0 ? userReview.Avg : null, userReview.Count, lastMsg));
        }

        return result;
    }

    /**
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-001
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-004
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-008
     */
    public async Task<PagedResult<ChatMessageDto>> GetMessagesAsync(int currentUserId, int conversationId, int page, int pageSize, CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 30;
        if (pageSize > 100) pageSize = 100;

        var conversation = await _dbContext.Conversations
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == conversationId, ct);

        if (conversation == null)
        {
            throw new KeyNotFoundException("Không tìm thấy cuộc hội thoại.");
        }

        // Chống IDOR
        if (conversation.UserAId != currentUserId && conversation.UserBId != currentUserId)
        {
            _logger.LogWarning("User {UserId} cố gắng truy cập trái phép hội thoại {ConversationId}", currentUserId, conversationId);
            throw new UnauthorizedAccessException("Bạn không có quyền truy cập vào cuộc hội thoại này.");
        }

        var query = _dbContext.ChatMessages
            .AsNoTracking()
            .Where(m => m.ConversationId == conversationId);

        var totalCount = await query.CountAsync(ct);

        var messages = await query
            .OrderByDescending(m => m.SentAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(m => m.Sender)
            .OrderBy(m => m.SentAt)
            .ToListAsync(ct);

        var items = messages.Select(m => new ChatMessageDto
        {
            Id = m.Id,
            ConversationId = m.ConversationId,
            SenderId = m.SenderId,
            SenderName = m.Sender.FullName,
            SenderAvatar = _storageService.GetPublicUrl(m.Sender.AvatarUrl),
            MessageText = m.MessageText,
            AttachmentUrl = !string.IsNullOrEmpty(m.AttachmentUrl) ? _storageService.GetPublicUrl(m.AttachmentUrl) : null,
            AttachmentType = m.AttachmentType,
            SentAt = m.SentAt,
            IsMine = (m.SenderId == currentUserId)
        }).ToList();

        return new PagedResult<ChatMessageDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    /**
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-002
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-007
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-012
     */
    public async Task<ConversationDto> GetOrCreateConversationAsync(int currentUserId, StartConversationRequestDto request, CancellationToken ct = default)
    {
        if (request.TargetUserId == currentUserId)
        {
            throw new BusinessException("Không thể tạo cuộc hội thoại với chính bản thân mình.");
        }

        var targetUser = await _dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == request.TargetUserId, ct);

        if (targetUser == null)
        {
            throw new KeyNotFoundException("Không tìm thấy người dùng đối phương.");
        }

        if (request.JobId.HasValue)
        {
            var jobExists = await _dbContext.Jobs.AnyAsync(j => j.Id == request.JobId.Value, ct);
            if (!jobExists)
            {
                throw new KeyNotFoundException("Công việc liên quan không tồn tại.");
            }
        }

        // Tìm kiếm cuộc hội thoại đã tồn tại giữa hai người (có xét JobId)
        var conversation = await _dbContext.Conversations
            .Include(c => c.UserA).ThenInclude(u => u.Role)
            .Include(c => c.UserB).ThenInclude(u => u.Role)
            .Include(c => c.Job)
            .FirstOrDefaultAsync(c =>
                ((c.UserAId == currentUserId && c.UserBId == request.TargetUserId) ||
                 (c.UserAId == request.TargetUserId && c.UserBId == currentUserId)) &&
                c.JobId == request.JobId, ct);

        if (conversation == null)
        {
            var now = DateTime.UtcNow;

            // Xác định phân loại Tab Yêu cầu vs Trò chuyện theo REQ-CHAT-012:
            // Nếu hai người đã có quan hệ việc làm (Job in_progress / completed, hoặc đơn accepted) -> active.
            // Ngược lại -> pending.
            var hasActiveWorkRelationship = false;
            if (request.JobId.HasValue)
            {
                var relatedJob = await _dbContext.Jobs.AsNoTracking().FirstOrDefaultAsync(j => j.Id == request.JobId.Value, ct);
                if (relatedJob != null &&
                    (relatedJob.HiredApplicantId == currentUserId || relatedJob.HiredApplicantId == request.TargetUserId ||
                     relatedJob.EmployerId == currentUserId || relatedJob.EmployerId == request.TargetUserId))
                {
                    hasActiveWorkRelationship = true;
                }
            }

            if (!hasActiveWorkRelationship)
            {
                hasActiveWorkRelationship = await _dbContext.Applications.AnyAsync(a =>
                    (a.StudentId == currentUserId && a.Job.EmployerId == request.TargetUserId && a.Status == "accepted") ||
                    (a.StudentId == request.TargetUserId && a.Job.EmployerId == currentUserId && a.Status == "accepted"), ct);
            }

            var initialStatus = hasActiveWorkRelationship ? "active" : "pending";

            conversation = new Conversation
            {
                UserAId = currentUserId,
                UserBId = request.TargetUserId,
                JobId = request.JobId,
                UnreadCountUserA = 0,
                UnreadCountUserB = 0,
                CreatedAt = now,
                LastMessageAt = now,
                RequestStatus = initialStatus,
                RequestInitiatedBy = currentUserId
            };

            _dbContext.Conversations.Add(conversation);
            await _dbContext.SaveChangesAsync(ct);

            await _dbContext.Entry(conversation).Reference(c => c.UserA).Query().Include(u => u.Role).LoadAsync(ct);
            await _dbContext.Entry(conversation).Reference(c => c.UserB).Query().Include(u => u.Role).LoadAsync(ct);
            if (conversation.JobId.HasValue)
            {
                await _dbContext.Entry(conversation).Reference(c => c.Job).LoadAsync(ct);
            }
        }

        var otherUser = (conversation.UserAId == currentUserId) ? conversation.UserB : conversation.UserA;

        var reviewsData = await _dbContext.Reviews
            .AsNoTracking()
            .Where(r => r.RevieweeId == otherUser.Id)
            .GroupBy(r => r.RevieweeId)
            .Select(g => new
            {
                AvgRating = g.Average(r => (double)r.Stars),
                Count = g.Count()
            })
            .FirstOrDefaultAsync(ct);

        return MapToDto(conversation, currentUserId, reviewsData != null ? Math.Round(reviewsData.AvgRating, 1) : null, reviewsData?.Count ?? 0, null);
    }

    /**
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-001
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-003
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-006
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-008
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-009
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-010
     */
    public async Task<ChatMessageDto> SendMessageAsync(int currentUserId, int conversationId, SendMessageRequestDto request, CancellationToken ct = default)
    {
        var conversation = await _dbContext.Conversations
            .Include(c => c.UserA)
            .Include(c => c.UserB)
            .Include(c => c.Job)
            .FirstOrDefaultAsync(c => c.Id == conversationId, ct);

        if (conversation == null)
        {
            throw new KeyNotFoundException("Không tìm thấy cuộc hội thoại.");
        }

        // Chống IDOR
        if (conversation.UserAId != currentUserId && conversation.UserBId != currentUserId)
        {
            _logger.LogWarning("User {UserId} cố gắng gửi tin nhắn trái phép vào hội thoại {ConversationId}", currentUserId, conversationId);
            throw new UnauthorizedAccessException("Bạn không có quyền gửi tin nhắn vào cuộc hội thoại này.");
        }

        // Cưỡng chế Vòng đời Job theo REQ-CHAT-008 và REQ-CHAT-009
        EnforceJobLifecycleState(conversation);

        var text = request.MessageText?.Trim();
        var hasAttachment = !string.IsNullOrWhiteSpace(request.AttachmentUrl);

        if (string.IsNullOrEmpty(text) && !hasAttachment)
        {
            throw new BusinessException("Nội dung tin nhắn hoặc tệp đính kèm không được để trống.");
        }

        // REQ-CHAT-006: Kiểm tra định dạng tệp nguy hại
        if (hasAttachment)
        {
            var ext = Path.GetExtension(request.AttachmentUrl)?.ToLowerInvariant();
            if (!string.IsNullOrEmpty(ext) && DisallowedExtensions.Contains(ext))
            {
                _logger.LogWarning("Phát hiện tệp đính kèm nguy hại {Extension} từ User {UserId}", ext, currentUserId);
                throw new BusinessException("Định dạng tệp không được hỗ trợ vì lý do bảo mật.");
            }
        }

        var now = DateTime.UtcNow;
        var message = new ChatMessage
        {
            ConversationId = conversationId,
            SenderId = currentUserId,
            MessageText = text,
            AttachmentUrl = request.AttachmentUrl?.Trim(),
            AttachmentType = request.AttachmentType?.Trim(),
            SentAt = now
        };

        _dbContext.ChatMessages.Add(message);

        // Cập nhật LastMessageAt và unread count cho người nhận
        conversation.LastMessageAt = now;
        var isUserA = (conversation.UserAId == currentUserId);
        var receiverUserId = isUserA ? conversation.UserBId : conversation.UserAId;

        if (isUserA)
        {
            conversation.UnreadCountUserB += 1;
            // Tự động bỏ lưu trữ cho người nhận nếu đang bị archived (REQ-CHAT-010)
            conversation.IsArchivedUserB = false;
        }
        else
        {
            conversation.UnreadCountUserA += 1;
            conversation.IsArchivedUserA = false;
        }

        // Nếu người nhận đang ở Tab Yêu cầu mà người nhận chủ động nhắn lại -> tự động chuyển sang active
        if (conversation.RequestStatus == "pending" && conversation.RequestInitiatedBy != currentUserId)
        {
            conversation.RequestStatus = "active";
        }

        await _dbContext.SaveChangesAsync(ct);

        var sender = isUserA ? conversation.UserA : conversation.UserB;

        var messageDto = new ChatMessageDto
        {
            Id = message.Id,
            ConversationId = message.ConversationId,
            SenderId = message.SenderId,
            SenderName = sender.FullName,
            SenderAvatar = _storageService.GetPublicUrl(sender.AvatarUrl),
            MessageText = message.MessageText,
            AttachmentUrl = !string.IsNullOrEmpty(message.AttachmentUrl) ? _storageService.GetPublicUrl(message.AttachmentUrl) : null,
            AttachmentType = message.AttachmentType,
            SentAt = message.SentAt,
            IsMine = true
        };

        // Phát sự kiện SignalR tới người nhận
        await _realtimeNotifier.NotifyNewMessageAsync(conversationId, receiverUserId, messageDto, ct);

        return messageDto;
    }

    /**
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-001
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-005
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-013
     */
    public async Task MarkAsReadAsync(int currentUserId, int conversationId, CancellationToken ct = default)
    {
        var conversation = await _dbContext.Conversations
            .FirstOrDefaultAsync(c => c.Id == conversationId, ct);

        if (conversation == null)
        {
            throw new KeyNotFoundException("Không tìm thấy cuộc hội thoại.");
        }

        if (conversation.UserAId != currentUserId && conversation.UserBId != currentUserId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền truy cập vào cuộc hội thoại này.");
        }

        var isUserA = (conversation.UserAId == currentUserId);
        var currentUnread = isUserA ? conversation.UnreadCountUserA : conversation.UnreadCountUserB;

        if (currentUnread > 0)
        {
            if (isUserA) conversation.UnreadCountUserA = 0;
            else conversation.UnreadCountUserB = 0;

            await _dbContext.SaveChangesAsync(ct);

            // Stealth Mode theo REQ-CHAT-013:
            // NẾU hội thoại đang ở Tab Yêu cầu (pending) mà người xem là người nhận:
            // TUYỆT ĐỐI KHÔNG phát tín hiệu 'Đã xem' về cho người gửi!
            var isPendingRequestViewer = (conversation.RequestStatus == "pending" && conversation.RequestInitiatedBy != currentUserId);
            if (!isPendingRequestViewer)
            {
                var otherUserId = isUserA ? conversation.UserBId : conversation.UserAId;
                await _realtimeNotifier.NotifyConversationReadAsync(otherUserId, conversationId, currentUserId, ct);
            }
        }
    }

    /**
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-010
     */
    public async Task ToggleArchiveConversationAsync(int currentUserId, int conversationId, bool archive, CancellationToken ct = default)
    {
        var conversation = await _dbContext.Conversations
            .FirstOrDefaultAsync(c => c.Id == conversationId, ct);

        if (conversation == null)
        {
            throw new KeyNotFoundException("Không tìm thấy cuộc hội thoại.");
        }

        if (conversation.UserAId != currentUserId && conversation.UserBId != currentUserId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền thay đổi trạng thái hội thoại này.");
        }

        if (conversation.UserAId == currentUserId)
        {
            conversation.IsArchivedUserA = archive;
        }
        else
        {
            conversation.IsArchivedUserB = archive;
        }

        await _dbContext.SaveChangesAsync(ct);
    }

    /**
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-012
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-013
     */
    public async Task AcceptMessageRequestAsync(int currentUserId, int conversationId, CancellationToken ct = default)
    {
        var conversation = await _dbContext.Conversations
            .FirstOrDefaultAsync(c => c.Id == conversationId, ct);

        if (conversation == null)
        {
            throw new KeyNotFoundException("Không tìm thấy cuộc hội thoại.");
        }

        if (conversation.UserAId != currentUserId && conversation.UserBId != currentUserId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền xử lý yêu cầu này.");
        }

        conversation.RequestStatus = "active";
        await _dbContext.SaveChangesAsync(ct);

        // Thông báo qua SignalR cho cả hai bên
        var otherUserId = (conversation.UserAId == currentUserId) ? conversation.UserBId : conversation.UserAId;
        await _realtimeNotifier.NotifyConversationReadAsync(otherUserId, conversationId, currentUserId, ct);
    }

    /**
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-012
     */
    public async Task DeclineMessageRequestAsync(int currentUserId, int conversationId, CancellationToken ct = default)
    {
        var conversation = await _dbContext.Conversations
            .FirstOrDefaultAsync(c => c.Id == conversationId, ct);

        if (conversation == null)
        {
            throw new KeyNotFoundException("Không tìm thấy cuộc hội thoại.");
        }

        if (conversation.UserAId != currentUserId && conversation.UserBId != currentUserId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền xử lý yêu cầu này.");
        }

        conversation.RequestStatus = "declined";
        if (conversation.UserAId == currentUserId) conversation.IsArchivedUserA = true;
        else conversation.IsArchivedUserB = true;

        await _dbContext.SaveChangesAsync(ct);
    }

    /**
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-003
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-006
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-008
     * @ears .sdd/features/feat-chat-messaging/SPEC.md#REQ-CHAT-009
     */
    public async Task<ChatMessageAttachmentDto> UploadAttachmentAsync(
        int currentUserId,
        int conversationId,
        Stream stream,
        string fileName,
        string contentType,
        long fileSize,
        CancellationToken ct = default)
    {
        var conversation = await _dbContext.Conversations
            .Include(c => c.Job)
            .FirstOrDefaultAsync(c => c.Id == conversationId, ct);

        if (conversation == null)
        {
            throw new KeyNotFoundException("Không tìm thấy cuộc hội thoại.");
        }

        if (conversation.UserAId != currentUserId && conversation.UserBId != currentUserId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền tải tệp vào cuộc hội thoại này.");
        }

        // Cưỡng chế Vòng đời Job theo REQ-CHAT-008 và REQ-CHAT-009
        EnforceJobLifecycleState(conversation);

        var ext = Path.GetExtension(fileName)?.ToLowerInvariant();
        if (string.IsNullOrEmpty(ext) || DisallowedExtensions.Contains(ext))
        {
            throw new BusinessException("Định dạng tệp không được phép tải lên vì lý do an toàn bảo mật.");
        }

        const long maxBytes = 20 * 1024 * 1024; // 20 MB
        if (fileSize > maxBytes)
        {
            throw new BusinessException("Dung lượng tệp đính kèm không được vượt quá 20MB.");
        }

        var uploadResult = await _storageService.UploadStreamAsync(stream, fileName, contentType, $"chat/{conversationId}", ct);

        return new ChatMessageAttachmentDto
        {
            FileUrl = _storageService.GetPublicUrl(uploadResult.FileKey),
            FileKey = uploadResult.FileKey,
            FileName = fileName,
            ContentType = contentType,
            FileSize = fileSize
        };
    }

    private static void EnforceJobLifecycleState(Conversation conversation)
    {
        if (conversation.Job == null) return;

        var status = conversation.Job.Status?.ToLowerInvariant();

        // REQ-CHAT-009: Khóa tức thì khi Job bị hủy do tranh chấp
        if (status == "cancelled")
        {
            throw new BusinessException("Dự án đã bị hủy do tranh chấp. Cuộc hội thoại đã bị khóa 2 chiều để chuyển sang giải quyết khiếu nại.");
        }

        // REQ-CHAT-008: Grace Period 30 ngày cho Job completed
        if (status == "completed")
        {
            var completedAt = conversation.Job.AutoReleaseAt ?? conversation.Job.DeadlineAt ?? conversation.CreatedAt;
            var gracePeriodExpiresAt = completedAt.AddDays(30);

            if (DateTime.UtcNow > gracePeriodExpiresAt)
            {
                throw new BusinessException("Dự án đã kết thúc thời gian hỗ trợ 30 ngày sau khi hoàn thành. Vui lòng tạo công việc mới để tiếp tục trao đổi.");
            }
        }
    }

    private ConversationDto MapToDto(
        Conversation c,
        int currentUserId,
        double? avgRating,
        int reviewCount,
        ChatMessage? lastMsg)
    {
        var isUserA = (c.UserAId == currentUserId);
        var otherUser = isUserA ? c.UserB : c.UserA;
        var unread = isUserA ? c.UnreadCountUserA : c.UnreadCountUserB;
        var isArchived = isUserA ? c.IsArchivedUserA : c.IsArchivedUserB;

        string? lastText = null;
        if (lastMsg != null)
        {
            lastText = !string.IsNullOrEmpty(lastMsg.MessageText)
                ? lastMsg.MessageText
                : (!string.IsNullOrEmpty(lastMsg.AttachmentUrl) ? "[Tệp đính kèm]" : null);
        }

        // Tính toán trạng thái Vòng đời Job (REQ-CHAT-008 & REQ-CHAT-009)
        bool isReadOnly = false;
        string? readOnlyReason = null;
        string? bannerMsg = null;
        DateTime? graceExpiresAt = null;

        if (c.Job != null)
        {
            var jobStatus = c.Job.Status?.ToLowerInvariant();
            if (jobStatus == "cancelled")
            {
                isReadOnly = true;
                readOnlyReason = "job_cancelled";
                bannerMsg = "Dự án đã bị hủy do tranh chấp. Toàn bộ trao đổi được chuyển sang Ticket hỗ trợ của Admin.";
            }
            else if (jobStatus == "completed")
            {
                var completedAt = c.Job.AutoReleaseAt ?? c.Job.DeadlineAt ?? c.CreatedAt;
                graceExpiresAt = completedAt.AddDays(30);

                if (DateTime.UtcNow > graceExpiresAt)
                {
                    isReadOnly = true;
                    readOnlyReason = "grace_period_expired";
                    bannerMsg = "Dự án đã kết thúc thời gian hỗ trợ 30 ngày. Vui lòng tạo việc mới để tiếp tục trao đổi.";
                }
                else
                {
                    var daysLeft = Math.Max(0, (int)(graceExpiresAt.Value - DateTime.UtcNow).TotalDays);
                    bannerMsg = $"Dự án đã hoàn thành. Thời gian hỗ trợ còn lại: {daysLeft} ngày.";
                }
            }
        }

        return new ConversationDto
        {
            Id = c.Id,
            UserAId = c.UserAId,
            UserBId = c.UserBId,
            OtherUserId = otherUser.Id,
            OtherUserName = otherUser.FullName,
            OtherUserAvatar = _storageService.GetPublicUrl(otherUser.AvatarUrl),
            OtherUserRole = otherUser.Role?.Code?.ToLower() ?? otherUser.Role?.Name?.ToLower(),
            OtherUserSchool = otherUser.School,
            OtherUserReliability = otherUser.ReliabilityScore,
            OtherUserJobsDone = otherUser.JobsDoneCount,
            OtherUserRating = avgRating,
            OtherUserReviewCount = reviewCount,
            JobId = c.JobId,
            JobTitle = c.Job?.Title,
            JobBudget = c.Job?.Budget,
            LastMessageAt = c.LastMessageAt ?? c.CreatedAt,
            LastMessageText = lastText,
            UnreadCount = unread,
            IsOnline = _presenceService.IsUserOnline(otherUser.Id),
            CreatedAt = c.CreatedAt,
            IsReadOnly = isReadOnly,
            ReadOnlyReason = readOnlyReason,
            StatusBannerMessage = bannerMsg,
            GracePeriodExpiresAt = graceExpiresAt,
            IsArchived = isArchived,
            RequestStatus = c.RequestStatus,
            IsRequestSender = (c.RequestInitiatedBy == currentUserId),
            RequestInitiatedBy = c.RequestInitiatedBy
        };
    }
}
