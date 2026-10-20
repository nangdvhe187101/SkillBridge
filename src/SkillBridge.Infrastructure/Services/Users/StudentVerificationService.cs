using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Text.RegularExpressions;
using System.Text.Json;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Net.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs;
using SkillBridge.Application.Interfaces;
using SkillBridge.Application.Interfaces.Admin;
using SkillBridge.Application.Interfaces.Storage;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Services.Admin;

namespace SkillBridge.Infrastructure.Services.Users
{
    public class StudentVerificationService : IStudentVerificationService
    {
        private readonly SkillBridgeDbContext dbContext;
        private readonly ILogger<StudentVerificationService> logger;
        private readonly IStorageService _storageService;
        private readonly ISystemSettingService? _systemSettingService;
        private readonly IEmailService? _emailService;
        private readonly IStudentCardOcrEngine _ocrEngine;

        public StudentVerificationService(
            SkillBridgeDbContext _dbContext,
            ILogger<StudentVerificationService> _logger,
            IStorageService storageService,
            IStudentCardOcrEngine ocrEngine,
            ISystemSettingService? systemSettingService = null,
            IEmailService? emailService = null)
        {
            dbContext = _dbContext;
            logger = _logger;
            _storageService = storageService;
            _ocrEngine = ocrEngine;
            _systemSettingService = systemSettingService;
            _emailService = emailService;
        }

        public async Task<List<SchoolDto>> GetSchoolsAsync()
        {
            return await dbContext.Schools
                .Where(s => s.IsActive)
                .OrderBy(s => s.Name)
                .Select(s => new SchoolDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    ShortName = s.ShortName
                })
                .ToListAsync();
        }

        public async Task<StudentVerificationResponseDto> SubmitVerificationAsync(int userId, SubmitStudentVerificationDto dto)
        {
            var user = await dbContext.Users
                .Include(u => u.StudentProfile)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                throw new BusinessException("Người dùng không tồn tại.");
            }

            var effectiveSchoolId = dto.SchoolId > 0 ? dto.SchoolId : (user.StudentProfile?.SchoolId ?? user.SchoolId ?? 0);
            var effectiveStudentCode = !string.IsNullOrWhiteSpace(dto.StudentCode)
                ? dto.StudentCode.Trim()
                : (!string.IsNullOrWhiteSpace(user.StudentProfile?.StudentCode)
                    ? user.StudentProfile!.StudentCode
                    : (!string.IsNullOrWhiteSpace(user.StudentCode) ? user.StudentCode : "CHỜ_DUYỆT"));

            var effectiveFullName = !string.IsNullOrWhiteSpace(dto.FullNameOnCard)
                ? dto.FullNameOnCard.Trim()
                : (!string.IsNullOrWhiteSpace(user.StudentProfile?.VerifiedFullName)
                    ? user.StudentProfile!.VerifiedFullName
                    : (!string.IsNullOrWhiteSpace(user.FullName) ? user.FullName : "Sinh viên"));

            var effectiveGraduationYear = dto.GraduationYear > 0
                ? dto.GraduationYear
                : (user.StudentProfile?.GraduationYear ?? user.GraduationYear ?? (short)(DateTime.UtcNow.Year + 2));

            if (effectiveSchoolId <= 0)
            {
                var defaultSchool = await dbContext.Schools.FirstOrDefaultAsync(s => s.IsActive);
                if (defaultSchool != null)
                {
                    effectiveSchoolId = defaultSchool.Id;
                }
                else
                {
                    throw new BusinessException("Hệ thống chưa có danh mục trường đại học khả dụng.");
                }
            }

            var school = await dbContext.Schools.FirstOrDefaultAsync(s => s.Id == effectiveSchoolId && s.IsActive);
            if (school == null)
            {
                throw new BusinessException("Trường đại học không tồn tại hoặc đã bị tạm ngưng.");
            }

            var studentCodeNormalized = effectiveStudentCode.ToUpperInvariant().Replace(" ", "");

            // 1. Kiểm tra xem MSSV này đã gắn với sinh viên nào khác đã verified chưa (bỏ qua nếu là placeholder)
            var isPlaceholderCode = string.Equals(studentCodeNormalized, "CHO_DUYET", StringComparison.OrdinalIgnoreCase)
                || string.Equals(studentCodeNormalized, "CHỜ_DUYỆT", StringComparison.OrdinalIgnoreCase)
                || string.Equals(studentCodeNormalized, "CHODUYET", StringComparison.OrdinalIgnoreCase);

            if (!isPlaceholderCode)
            {
                var existsVerified = await dbContext.StudentProfiles
                    .AnyAsync(p => p.SchoolId == effectiveSchoolId && p.StudentCodeNormalized == studentCodeNormalized && p.UserId != userId);

                if (existsVerified)
                {
                    throw new BusinessException("Mã số sinh viên này đã được liên kết với một tài khoản sinh viên đã xác minh khác.");
                }
            }

            // 2. Kiểm tra xem user có đơn pending không
            var existingPending = await dbContext.StudentVerificationRequests
                .FirstOrDefaultAsync(r => r.UserId == userId && r.Status == "pending");

            if (existingPending != null)
            {
                throw new BusinessException("Bạn đang có một yêu cầu xác minh thẻ sinh viên đang chờ duyệt. Vui lòng kiên nhẫn chờ phản hồi từ quản trị viên.");
            }

            // 3. Nếu đang ở trạng thái need_more_info -> cập nhật trên cùng hồ sơ
            var needInfoRequest = await dbContext.StudentVerificationRequests
                .Include(r => r.Documents)
                .FirstOrDefaultAsync(r => r.UserId == userId && r.Status == "need_more_info");

            var hasExistingProfile = await dbContext.StudentProfiles.AnyAsync(p => p.UserId == userId);
            var requestType = hasExistingProfile ? "update" : "initial";

            if (hasExistingProfile)
            {
                var wallet = await dbContext.Wallets.FirstOrDefaultAsync(w => w.UserId == userId);
                if (wallet != null)
                {
                    wallet.WithdrawHoldReason = "Đang chờ duyệt hồ sơ thay đổi định danh / thẻ sinh viên";
                    wallet.WithdrawHoldUntil = DateTime.UtcNow.AddDays(7);
                }
            }

            StudentVerificationRequest request;

            if (needInfoRequest != null)
            {
                request = needInfoRequest;
                request.SchoolId = effectiveSchoolId;
                request.StudentCode = effectiveStudentCode;
                request.StudentCodeNormalized = studentCodeNormalized;
                request.FullNameOnCard = effectiveFullName;
                request.GraduationYear = effectiveGraduationYear;
                request.Status = "pending";
                request.SubmittedAt = DateTime.UtcNow;
                request.NeedInfoDeadline = null;
            }
            else
            {
                request = new StudentVerificationRequest
                {
                    UserId = userId,
                    SchoolId = effectiveSchoolId,
                    StudentCode = effectiveStudentCode,
                    StudentCodeNormalized = studentCodeNormalized,
                    FullNameOnCard = effectiveFullName,
                    GraduationYear = effectiveGraduationYear,
                    Status = "pending",
                    RequestType = requestType,
                    SubmittedAt = DateTime.UtcNow,
                    ResubmitAllowed = true
                };

                await dbContext.StudentVerificationRequests.AddAsync(request);
            }

            await dbContext.SaveChangesAsync();

            // 4. Lưu ảnh thẻ
            var frontDoc = new IdentityDocument
            {
                UserId = userId,
                VerificationRequestId = request.Id,
                DocType = "student_card",
                Side = "front",
                FileName = $"student_card_front_{userId}_{request.Id}.jpg",
                FileUrl = dto.FrontCardUrl,
                PublicId = $"sc_front_{userId}_{request.Id}",
                FileType = "image/jpeg",
                FileSize = 0,
                UploadedAt = DateTime.UtcNow,
                PurgeAfter = DateTime.UtcNow.AddDays(90)
            };
            await dbContext.IdentityDocuments.AddAsync(frontDoc);

            if (!string.IsNullOrWhiteSpace(dto.BackCardUrl))
            {
                var backDoc = new IdentityDocument
                {
                    UserId = userId,
                    VerificationRequestId = request.Id,
                    DocType = "student_card",
                    Side = "back",
                    FileName = $"student_card_back_{userId}_{request.Id}.jpg",
                    FileUrl = dto.BackCardUrl,
                    PublicId = $"sc_back_{userId}_{request.Id}",
                    FileType = "image/jpeg",
                    FileSize = 0,
                    UploadedAt = DateTime.UtcNow,
                    PurgeAfter = DateTime.UtcNow.AddDays(90)
                };
                await dbContext.IdentityDocuments.AddAsync(backDoc);
            }

            await dbContext.SaveChangesAsync();

            return new StudentVerificationResponseDto
            {
                Id = request.Id,
                UserId = request.UserId,
                SchoolId = request.SchoolId,
                SchoolName = school.Name,
                StudentCode = request.StudentCode,
                FullNameOnCard = request.FullNameOnCard,
                GraduationYear = request.GraduationYear,
                Status = request.Status,
                SubmittedAt = request.SubmittedAt,
                FrontCardUrl = dto.FrontCardUrl,
                BackCardUrl = dto.BackCardUrl
            };
        }

        public async Task<StudentVerificationResponseDto?> GetLatestSubmittedVerificationAsync(int userId)
        {
            var request = await dbContext.StudentVerificationRequests
                .Include(r => r.School)
                .Include(r => r.Documents)
                .Where(r => r.UserId == userId)
                .OrderByDescending(r => r.SubmittedAt)
                .FirstOrDefaultAsync();

            // Sinh viên chưa từng nộp yêu cầu xác minh nào: trả về null thật,
            // không suy luận "đã phê duyệt" từ cờ KycStatus trên bảng users
            if (request == null)
            {
                return null;
            }

            var frontDoc = request.Documents.FirstOrDefault(d => d.Side == "front");
            var backDoc = request.Documents.FirstOrDefault(d => d.Side == "back");

            return new StudentVerificationResponseDto
            {
                Id = request.Id,
                UserId = request.UserId,
                SchoolId = request.SchoolId,
                SchoolName = request.School?.Name ?? string.Empty,
                StudentCode = request.StudentCode,
                FullNameOnCard = request.FullNameOnCard,
                GraduationYear = request.GraduationYear,
                Status = request.Status,
                ReasonCode = request.ReasonCode,
                UserMessage = request.UserMessage,
                RejectionReason = request.RejectionReason,
                AdminNote = request.AdminNote,
                NeedInfoDeadline = request.NeedInfoDeadline,
                SubmittedAt = request.SubmittedAt,
                ReviewedAt = request.ReviewedAt,
                FrontCardUrl = _storageService.GetPublicUrl(frontDoc?.FileUrl),
                BackCardUrl = _storageService.GetPublicUrl(backDoc?.FileUrl)
            };
        }

        public async Task<StudentVerificationResponseDto?> GetLatestVerificationAsync(int userId)
        {
            var request = await dbContext.StudentVerificationRequests
                .Include(r => r.School)
                .Include(r => r.Documents)
                .Where(r => r.UserId == userId)
                .OrderByDescending(r => r.SubmittedAt)
                .FirstOrDefaultAsync();

            if (request == null)
            {
                var user = await dbContext.Users
                    .Include(u => u.StudentProfile)
                    .ThenInclude(p => p!.School)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null) return null;

                var isVerified = string.Equals(user.KycStatus, "verified", StringComparison.OrdinalIgnoreCase);
                return new StudentVerificationResponseDto
                {
                    Id = user.StudentProfile?.SourceRequestId ?? 0,
                    UserId = user.Id,
                    SchoolId = user.StudentProfile?.SchoolId ?? user.SchoolId ?? 0,
                    SchoolName = user.StudentProfile?.School?.Name ?? user.School ?? string.Empty,
                    StudentCode = user.StudentProfile?.StudentCode ?? user.StudentCode ?? string.Empty,
                    FullNameOnCard = user.StudentProfile?.VerifiedFullName ?? user.FullName ?? string.Empty,
                    GraduationYear = user.StudentProfile?.GraduationYear ?? user.GraduationYear ?? (short)(DateTime.UtcNow.Year + 2),
                    Status = isVerified ? "approved" : "unverified",
                    SubmittedAt = user.StudentProfile?.VerifiedAt ?? DateTime.UtcNow,
                    ReviewedAt = user.StudentProfile?.VerifiedAt
                };
            }

            var frontDoc = request.Documents.FirstOrDefault(d => d.Side == "front");
            var backDoc = request.Documents.FirstOrDefault(d => d.Side == "back");

            return new StudentVerificationResponseDto
            {
                Id = request.Id,
                UserId = request.UserId,
                SchoolId = request.SchoolId,
                SchoolName = request.School?.Name ?? string.Empty,
                StudentCode = request.StudentCode,
                FullNameOnCard = request.FullNameOnCard,
                GraduationYear = request.GraduationYear,
                Status = request.Status,
                ReasonCode = request.ReasonCode,
                UserMessage = request.UserMessage,
                RejectionReason = request.RejectionReason,
                AdminNote = request.AdminNote,
                NeedInfoDeadline = request.NeedInfoDeadline,
                SubmittedAt = request.SubmittedAt,
                ReviewedAt = request.ReviewedAt,
                FrontCardUrl = _storageService.GetPublicUrl(frontDoc?.FileUrl),
                BackCardUrl = _storageService.GetPublicUrl(backDoc?.FileUrl)
            };
        }

        public async Task<List<StudentVerificationResponseDto>> GetPendingVerificationsForAdminAsync()
        {
            var requests = await dbContext.StudentVerificationRequests
                .Include(r => r.School)
                .Include(r => r.User)
                .Include(r => r.Documents)
                .Where(r => r.Status == "pending")
                .OrderBy(r => r.SubmittedAt)
                .ToListAsync();

            return requests.Select(r =>
            {
                var frontDoc = r.Documents.FirstOrDefault(d => d.Side == "front");
                var backDoc = r.Documents.FirstOrDefault(d => d.Side == "back");

                return new StudentVerificationResponseDto
                {
                    Id = r.Id,
                    UserId = r.UserId,
                    UserEmail = r.User?.Email ?? string.Empty,
                    UserName = r.User?.FullName ?? string.Empty,
                    SchoolId = r.SchoolId,
                    SchoolName = r.School?.Name ?? string.Empty,
                    StudentCode = r.StudentCode,
                    FullNameOnCard = r.FullNameOnCard,
                    GraduationYear = r.GraduationYear,
                    Status = r.Status,
                    OcrResultJson = r.OcrResultJson,
                    ReasonCode = r.ReasonCode,
                    UserMessage = r.UserMessage,
                    SubmittedAt = r.SubmittedAt,
                    FrontCardUrl = _storageService.GetPublicUrl(frontDoc?.FileUrl),
                    BackCardUrl = _storageService.GetPublicUrl(backDoc?.FileUrl)
                };
            }).ToList();
        }

        public async Task<StudentVerificationResponseDto> ReviewVerificationAsync(int requestId, int adminId, AdminReviewVerificationDto dto)
        {
            var request = await dbContext.StudentVerificationRequests
                .Include(r => r.School)
                .Include(r => r.User)
                .Include(r => r.Documents)
                .FirstOrDefaultAsync(r => r.Id == requestId);

            if (request == null)
            {
                throw new BusinessException("Không tìm thấy yêu cầu xác minh sinh viên.");
            }

            if (request.Status != "pending" && request.Status != "need_more_info")
            {
                throw new BusinessException($"Yêu cầu này đang ở trạng thái '{request.Status}', không thể duyệt lại.");
            }

            if (string.IsNullOrWhiteSpace(dto.Decision))
            {
                throw new BusinessException("Vui lòng chọn quyết định kiểm duyệt (approve, need_more_info, hoặc reject).");
            }

            var decision = dto.Decision.Trim().ToLowerInvariant();
            var adminMemberId = await EnsureAdminMemberIdAsync(adminId);

            if (decision == "approve")
            {
                request.Status = "approved";
                request.ReviewedByAdminId = adminMemberId;
                request.ReviewedAt = DateTime.UtcNow;
                request.AdminNote = dto.AdminNote;

                if (!string.IsNullOrWhiteSpace(dto.StudentCode))
                {
                    request.StudentCode = dto.StudentCode.Trim().ToUpperInvariant();
                    request.StudentCodeNormalized = request.StudentCode.Replace(" ", "");
                }
                if (!string.IsNullOrWhiteSpace(dto.FullNameOnCard))
                {
                    request.FullNameOnCard = dto.FullNameOnCard.Trim();
                }
                if (dto.GraduationYear.HasValue && dto.GraduationYear.Value > 0)
                {
                    request.GraduationYear = (short)dto.GraduationYear.Value;
                }
                if (dto.SchoolId.HasValue && dto.SchoolId.Value > 0)
                {
                    var targetSchool = await dbContext.Schools.FirstOrDefaultAsync(s => s.Id == dto.SchoolId.Value && s.IsActive);
                    if (targetSchool != null)
                    {
                        request.SchoolId = targetSchool.Id;
                        request.School = targetSchool;
                    }
                }

                // Kiểm tra trùng MSSV tại cùng trường với tài khoản khác
                if (!string.IsNullOrWhiteSpace(request.StudentCodeNormalized))
                {
                    var existingCodeOwner = await dbContext.StudentProfiles
                        .FirstOrDefaultAsync(p => p.SchoolId == request.SchoolId 
                                               && p.StudentCodeNormalized == request.StudentCodeNormalized 
                                               && p.UserId != request.UserId);
                    if (existingCodeOwner != null)
                    {
                        throw new BusinessException($"Mã số sinh viên '{request.StudentCode}' tại trường này đã được xác thực bởi một tài khoản khác.");
                    }
                }

                // Tính hạn mốc hết năm tốt nghiệp: YYYY-12-31 23:59:59
                var gradYear = request.GraduationYear >= 2000 && request.GraduationYear <= 2100
                    ? (int)request.GraduationYear
                    : DateTime.UtcNow.Year + 2;
                var expiresAt = new DateTime(gradYear, 12, 31, 23, 59, 59, DateTimeKind.Utc);

                var profile = await dbContext.StudentProfiles.FirstOrDefaultAsync(p => p.UserId == request.UserId);
                if (profile == null)
                {
                    profile = new StudentProfile
                    {
                        UserId = request.UserId,
                        SchoolId = request.SchoolId,
                        StudentCode = request.StudentCode,
                        StudentCodeNormalized = request.StudentCodeNormalized,
                        VerifiedFullName = request.FullNameOnCard,
                        GraduationYear = request.GraduationYear,
                        VerifiedAt = DateTime.UtcNow,
                        ExpiresAt = expiresAt,
                        SourceRequestId = request.Id
                    };
                    await dbContext.StudentProfiles.AddAsync(profile);
                }
                else
                {
                    profile.SchoolId = request.SchoolId;
                    profile.StudentCode = request.StudentCode;
                    profile.StudentCodeNormalized = request.StudentCodeNormalized;
                    profile.VerifiedFullName = request.FullNameOnCard;
                    profile.GraduationYear = request.GraduationYear;
                    profile.VerifiedAt = DateTime.UtcNow;
                    profile.ExpiresAt = expiresAt;
                    profile.SourceRequestId = request.Id;
                }

                // Cập nhật trạng thái người dùng
                if (request.User != null)
                {
                    request.User.KycStatus = "verified";
                    request.User.FullName = request.FullNameOnCard;
                    if (request.School != null)
                    {
                        request.User.School = request.School.Name;
                    }
                    request.User.SchoolId = request.SchoolId;
                    request.User.StudentCode = request.StudentCode;
                    request.User.GraduationYear = request.GraduationYear;
                }

                // Gửi thông báo in-app cho sinh viên
                var schoolNameText = request.School?.Name ?? "trường đã đăng ký";
                var studentMsg = $"Chúc mừng bạn! Hồ sơ xác minh thẻ sinh viên trường {schoolNameText} đã được phê duyệt. Bạn đã mở khóa toàn bộ quyền ứng tuyển và rút tiền.";
                if (studentMsg.Length > 250) studentMsg = studentMsg.Substring(0, 247) + "...";

                await dbContext.Notifications.AddAsync(new Notification
                {
                    UserId = request.UserId,
                    Icon = "🎓",
                    Title = "Xác minh thẻ sinh viên thành công",
                    MessageText = studentMsg,
                    Link = "/profile",
                    Type = "student_verified",
                    RelatedEntityType = "student_verification_requests",
                    RelatedEntityId = request.Id,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                });

                // Tự động kích hoạt các đơn ứng tuyển đang ở trạng thái awaiting_verification
                var awaitingApps = await dbContext.Applications
                    .Include(a => a.Job)
                    .Where(a => a.StudentId == request.UserId && a.Status == "awaiting_verification")
                    .ToListAsync();

                foreach (var app in awaitingApps)
                {
                    app.Status = "pending";
                    app.AppliedAt = DateTime.UtcNow;
                    app.UpdatedAt = DateTime.UtcNow;

                    if (app.Job != null && app.Job.EmployerId > 0)
                    {
                        var appMsg = $"Ứng viên {request.FullNameOnCard} đã hoàn tất xác minh thẻ sinh viên và nộp đơn vào công việc: {app.Job.Title}.";
                        if (appMsg.Length > 250) appMsg = appMsg.Substring(0, 247) + "...";

                        await dbContext.Notifications.AddAsync(new Notification
                        {
                            UserId = app.Job.EmployerId,
                            Icon = "📄",
                            Title = "Đơn ứng tuyển mới",
                            MessageText = appMsg,
                            Link = $"/employer/jobs/{app.JobId}/applications",
                            Type = "job_application",
                            RelatedEntityType = "applications",
                            RelatedEntityId = app.Id,
                            IsRead = false,
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }

                _ = SendStudentVerificationApprovalEmailAsync(request);
            }
            else if (decision == "need_more_info")
            {
                request.Status = "need_more_info";
                request.ReviewedByAdminId = adminMemberId;
                request.ReviewedAt = DateTime.UtcNow;
                request.ReasonCode = dto.ReasonCode;
                request.UserMessage = dto.UserMessage ?? "Vui lòng chụp lại ảnh thẻ rõ nét hơn hoặc bổ sung giấy tờ xác minh theo yêu cầu.";
                request.AdminNote = dto.AdminNote;
                request.NeedInfoDeadline = DateTime.UtcNow.AddDays(dto.NeedInfoDeadlineDays ?? 7);

                var needInfoMsg = request.UserMessage;
                if (needInfoMsg.Length > 250) needInfoMsg = needInfoMsg.Substring(0, 247) + "...";

                await dbContext.Notifications.AddAsync(new Notification
                {
                    UserId = request.UserId,
                    Icon = "⚠️",
                    Title = "Yêu cầu bổ sung thông tin thẻ sinh viên",
                    MessageText = needInfoMsg,
                    Link = "/profile",
                    Type = "student_need_info",
                    RelatedEntityType = "student_verification_requests",
                    RelatedEntityId = request.Id,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                });

                _ = SendStudentVerificationNeedInfoEmailAsync(request);
            }
            else if (decision == "reject")
            {
                request.Status = "rejected";
                request.ReviewedByAdminId = adminMemberId;
                request.ReviewedAt = DateTime.UtcNow;
                request.ReasonCode = dto.ReasonCode;
                request.RejectionReason = dto.RejectionReason ?? "Hồ sơ xác minh thẻ sinh viên không đạt yêu cầu.";
                request.AdminNote = dto.AdminNote;

                // Xóa ảnh sớm hơn cho hồ sơ bị từ chối (30 ngày)
                foreach (var doc in request.Documents)
                {
                    doc.PurgeAfter = DateTime.UtcNow.AddDays(30);
                }

                var rejectMsg = request.RejectionReason;
                if (rejectMsg.Length > 250) rejectMsg = rejectMsg.Substring(0, 247) + "...";

                await dbContext.Notifications.AddAsync(new Notification
                {
                    UserId = request.UserId,
                    Icon = "❌",
                    Title = "Hồ sơ xác minh thẻ sinh viên bị từ chối",
                    MessageText = rejectMsg,
                    Link = "/profile",
                    Type = "student_rejected",
                    RelatedEntityType = "student_verification_requests",
                    RelatedEntityId = request.Id,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                });

                _ = SendStudentVerificationRejectionEmailAsync(request);
            }
            else
            {
                throw new BusinessException("Quyết định kiểm duyệt không hợp lệ. Chỉ chấp nhận 'approve', 'need_more_info', hoặc 'reject'.");
            }

            if (decision == "approve" || decision == "reject")
            {
                var wallet = await dbContext.Wallets.FirstOrDefaultAsync(w => w.UserId == request.UserId);
                if (wallet != null && wallet.WithdrawHoldReason == "Đang chờ duyệt hồ sơ thay đổi định danh / thẻ sinh viên")
                {
                    wallet.WithdrawHoldReason = null;
                    wallet.WithdrawHoldUntil = null;
                }
            }

            await dbContext.SaveChangesAsync();

            var front = request.Documents.FirstOrDefault(d => d.Side == "front");
            var back = request.Documents.FirstOrDefault(d => d.Side == "back");

            return new StudentVerificationResponseDto
            {
                Id = request.Id,
                UserId = request.UserId,
                SchoolId = request.SchoolId,
                SchoolName = request.School?.Name ?? string.Empty,
                StudentCode = request.StudentCode,
                FullNameOnCard = request.FullNameOnCard,
                GraduationYear = request.GraduationYear,
                Status = request.Status,
                ReasonCode = request.ReasonCode,
                UserMessage = request.UserMessage,
                RejectionReason = request.RejectionReason,
                AdminNote = request.AdminNote,
                NeedInfoDeadline = request.NeedInfoDeadline,
                SubmittedAt = request.SubmittedAt,
                ReviewedAt = request.ReviewedAt,
                FrontCardUrl = _storageService.GetPublicUrl(front?.FileUrl),
                BackCardUrl = _storageService.GetPublicUrl(back?.FileUrl)
            };
        }

        public async Task<StudentCardOcrResultDto> PerformOcrAsync(int requestId, CancellationToken ct = default)
        {
            var request = await dbContext.StudentVerificationRequests
                .Include(r => r.Documents)
                .Include(r => r.School)
                .FirstOrDefaultAsync(r => r.Id == requestId, ct);

            if (request == null)
            {
                throw new BusinessException("Không tìm thấy hồ sơ xác minh sinh viên.");
            }

            var frontDoc = request.Documents.FirstOrDefault(d => d.Side == "front");
            if (frontDoc == null || string.IsNullOrWhiteSpace(frontDoc.FileUrl))
            {
                throw new BusinessException("Hồ sơ không có ảnh mặt trước thẻ sinh viên.");
            }

            var tempImagePath = Path.Combine(Path.GetTempPath(), $"card_ocr_{requestId}_{Guid.NewGuid():N}.jpg");
            try
            {
                var downloadUrl = _storageService.GetPublicUrl(frontDoc.FileUrl);

                using (var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(15) })
                {
                    var imageBytes = await httpClient.GetByteArrayAsync(downloadUrl, ct);
                    await File.WriteAllBytesAsync(tempImagePath, imageBytes, ct);
                }

                // Nhận diện chữ thô bằng Tesseract OCR (chạy được trên Render/Linux).
                // Logic trích xuất bên dưới (mã sinh viên, tên, trường, niên khóa) được
                // port 1:1 từ scripts/student_card_ocr.swift (Apple Vision Framework cũ,
                // chỉ chạy trên macOS — giữ lại file đó trong repo để tham khảo/đối chiếu
                // độ chính xác, không còn được gọi từ code).
                var recognizedBlocks = await _ocrEngine.RecognizeAsync(tempImagePath, ct);
                var recognizedLines = recognizedBlocks.Select(b => b.Text).ToList();

                if (recognizedLines.Count == 0)
                {
                    logger.LogWarning("OCR không nhận diện được chữ nào trong ảnh. RequestId: {RequestId}", requestId);
                    return new StudentCardOcrResultDto
                    {
                        Success = false,
                        Error = "Không thể nhận diện nội dung từ ảnh thẻ sinh viên."
                    };
                }

                var studentCode = ExtractStudentCode(recognizedLines);
                var schoolNameRaw = ExtractSchoolName(recognizedLines);
                var gradYear = ExtractGraduationYear(recognizedLines);
                var fullName = ExtractFullName(recognizedBlocks);

                var schoolName = schoolNameRaw;
                int? matchedSchoolId = null;
                if (!string.IsNullOrWhiteSpace(schoolName))
                {
                    var cleanSchoolName = schoolName.Trim();
                    var activeSchools = await dbContext.Schools.AsNoTracking().Where(s => s.IsActive).ToListAsync(ct);
                    var school = activeSchools.FirstOrDefault(s =>
                        s.Name.Contains(cleanSchoolName, StringComparison.OrdinalIgnoreCase) ||
                        cleanSchoolName.Contains(s.Name, StringComparison.OrdinalIgnoreCase) ||
                        (!string.IsNullOrWhiteSpace(s.Code) && cleanSchoolName.Contains(s.Code, StringComparison.OrdinalIgnoreCase)));
                    if (school != null)
                    {
                        matchedSchoolId = school.Id;
                        schoolName = school.Name;
                    }
                }

                var ocrResultJson = JsonSerializer.Serialize(new
                {
                    success = true,
                    studentCode,
                    fullName,
                    schoolName = schoolNameRaw,
                    graduationYear = gradYear,
                    rawLines = recognizedLines
                });
                request.OcrResultJson = ocrResultJson;
                await dbContext.SaveChangesAsync(ct);

                return new StudentCardOcrResultDto
                {
                    Success = true,
                    StudentCode = studentCode,
                    FullName = fullName,
                    SchoolName = schoolName,
                    SchoolId = matchedSchoolId,
                    GraduationYear = gradYear,
                    RawLines = recognizedLines
                };
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Lỗi khi thực hiện OCR thẻ sinh viên request ID: {RequestId}", requestId);
                return new StudentCardOcrResultDto
                {
                    Success = false,
                    Error = ex.Message
                };
            }
            finally
            {
                if (File.Exists(tempImagePath))
                {
                    try { File.Delete(tempImagePath); } catch { }
                }
            }
        }

        // ===== Logic trích xuất thông tin thẻ sinh viên — port từ scripts/student_card_ocr.swift =====

        private static readonly Regex[] StudentCodeRegexes =
        {
            new(@"(?:Student\s*ID|MSSV|Mã\s*(?:số)?\s*sinh\s*viên)[:\s]*([A-Za-z]{1,4}\d{4,8})", RegexOptions.IgnoreCase),
            new(@"\b([A-Za-z]{2}\d{6,8})\b", RegexOptions.IgnoreCase),
            new(@"\b([A-Za-z]{1,3}\d{5,8})\b", RegexOptions.IgnoreCase),
            new(@"\b(\d{7,10})\b", RegexOptions.IgnoreCase)
        };

        private static readonly Regex GraduationYearRegex = new(@"(?:20\d{2})\s*[-–/]\s*(20\d{2})", RegexOptions.None);

        private static string? ExtractStudentCode(List<string> recognizedLines)
        {
            foreach (var line in recognizedLines)
            {
                foreach (var regex in StudentCodeRegexes)
                {
                    var match = regex.Match(line);
                    if (match.Success)
                    {
                        var captureGroup = match.Groups.Count > 1 ? match.Groups[1] : match.Groups[0];
                        var code = captureGroup.Value.ToUpperInvariant();
                        if (code.Length >= 6)
                        {
                            return code;
                        }
                    }
                }
            }
            return null;
        }

        private static string? ExtractSchoolName(List<string> recognizedLines)
        {
            foreach (var line in recognizedLines)
            {
                var lower = line.ToLowerInvariant();
                if (lower.Contains("fpt")) return "Đại học FPT";
                if (lower.Contains("bách khoa") || lower.Contains("bach khoa") || lower.Contains("hust")) return "Đại học Bách Khoa";
                if (lower.Contains("quốc gia") || lower.Contains("vnu")) return "Đại học Quốc Gia";
                if (lower.Contains("kinh tế") || lower.Contains("neu")) return "Đại học Kinh tế Quốc dân";
                if (lower.Contains("đại học") || lower.Contains("cao đẳng") || lower.Contains("university")) return line;
            }
            return null;
        }

        private static int? ExtractGraduationYear(List<string> recognizedLines)
        {
            foreach (var line in recognizedLines)
            {
                var match = GraduationYearRegex.Match(line);
                if (match.Success && match.Groups.Count > 1 && int.TryParse(match.Groups[1].Value, out var year))
                {
                    return year;
                }
            }
            return null;
        }

        private static string RemoveAccents(string input)
        {
            var normalized = input.Normalize(System.Text.NormalizationForm.FormD);
            var sb = new System.Text.StringBuilder();
            foreach (var c in normalized)
            {
                var category = System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c);
                if (category != System.Globalization.UnicodeCategory.NonSpacingMark)
                {
                    sb.Append(c);
                }
            }
            return sb.ToString().Normalize(System.Text.NormalizationForm.FormC)
                .Replace('Đ', 'D').Replace('đ', 'd');
        }

        private static string CleanNameToken(string text)
        {
            var letters = text.Where(char.IsLetter).ToList();
            var asciiLetters = letters.Where(c => c < 128).ToList();
            if (letters.Count > 0 && (double)asciiLetters.Count / letters.Count >= 0.6)
            {
                return RemoveAccents(text);
            }
            return text;
        }

        private static bool IsSystemLabel(string text)
        {
            var clean = RemoveAccents(text.ToLowerInvariant());
            return clean.Contains("truong dai hoc") || clean.Contains("dai hoc") || clean.Contains("cao dang")
                || clean.Contains("university") || clean.Contains("education") || clean.Contains("student id")
                || clean.Contains("period of study") || clean.Contains("student") || clean.Length <= 1;
        }

        private static string? ExtractFullName(List<OcrTextBlock> blocks)
        {
            // Sắp theo Y giảm dần (cùng quy ước toạ độ chuẩn hoá 0-1, gốc dưới-trái, như bản Swift gốc).
            var sortedBlocks = blocks.OrderByDescending(b => b.Y).ToList();

            var nameBlocks = new List<OcrTextBlock>();
            OcrTextBlock? primary = null;

            foreach (var b in sortedBlocks)
            {
                if (IsSystemLabel(b.Text)) continue;
                var words = b.Text.Split(new[] { ' ', '\t', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);
                var isAllUpper = b.Text == b.Text.ToUpperInvariant();

                if (isAllUpper && words.Length >= 2 && words.Length <= 5 && primary == null)
                {
                    primary = b;
                    nameBlocks.Add(b);
                    break;
                }
            }

            if (primary != null)
            {
                var primeCenterX = primary.X + primary.Width / 2.0;

                foreach (var b in sortedBlocks)
                {
                    if (b.Text == primary.Text) continue;
                    if (IsSystemLabel(b.Text)) continue;

                    var bCenterX = b.X + b.Width / 2.0;
                    var centerDiff = Math.Abs(primeCenterX - bCenterX);
                    var yGap = primary.Y - (b.Y + b.Height);
                    var words = b.Text.Split(new[] { ' ', '\t', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);

                    if (yGap >= -0.015 && yGap < 0.045 && centerDiff < 0.15 && words.Length >= 1 && words.Length <= 3 && b.Text == b.Text.ToUpperInvariant())
                    {
                        nameBlocks.Add(b);
                        break;
                    }
                }
            }

            if (nameBlocks.Count == 0)
            {
                return null;
            }

            var combinedRaw = string.Join(" ", nameBlocks.Select(b => b.Text));
            return CleanNameToken(combinedRaw);
        }

        private async Task<int?> EnsureAdminMemberIdAsync(int adminUserId, CancellationToken ct = default)
        {
            // 1. Kiểm tra trực tiếp xem adminUserId có trùng với Id trong admin_team_members không
            var memberById = await dbContext.AdminTeamMembers
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == adminUserId, ct);
            if (memberById != null) return memberById.Id;

            // 2. Kiểm tra theo email của adminUser
            var adminUser = await dbContext.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == adminUserId, ct);
            if (adminUser != null && !string.IsNullOrWhiteSpace(adminUser.Email))
            {
                var memberByEmail = await dbContext.AdminTeamMembers
                    .AsNoTracking()
                    .FirstOrDefaultAsync(a => a.Email == adminUser.Email, ct);
                if (memberByEmail != null) return memberByEmail.Id;
            }

            // 3. Fallback lấy bất kỳ admin member nào đang hoạt động
            var fallbackAdmin = await dbContext.AdminTeamMembers
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.IsActive == true, ct);
            if (fallbackAdmin != null) return fallbackAdmin.Id;

            var defaultAdmin = await dbContext.AdminTeamMembers
                .AsNoTracking()
                .FirstOrDefaultAsync(ct);
            return defaultAdmin?.Id;
        }

        private async Task SendStudentVerificationApprovalEmailAsync(StudentVerificationRequest request)
        {
            try
            {
                if (_emailService == null || _systemSettingService == null) return;
                var isEnabled = await _systemSettingService.IsFeatureEnabledAsync(SystemSettingService.KeyEmailStudentVerification, true);
                if (!isEnabled) return;

                var user = request.User ?? await dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == request.UserId);
                if (user == null || string.IsNullOrWhiteSpace(user.Email)) return;

                var safeFullName = WebUtility.HtmlEncode(request.FullNameOnCard ?? user.FullName ?? "bạn");
                var safeSchoolName = WebUtility.HtmlEncode(request.School?.Name ?? "Đại học / Cao đẳng");
                var safeStudentCode = WebUtility.HtmlEncode(request.StudentCode);
                var subject = "[SkillBridge] Hồ sơ thẻ sinh viên của bạn đã được xác thực thành công";
                var body = $@"
<div style=""font-family: Arial, sans-serif; line-height: 1.6; color: #333;"">
    <h2 style=""color: #10b981;"">Xác thực sinh viên thành công! 🎓</h2>
    <p>Xin chào <strong>{safeFullName}</strong>,</p>
    <p>Hồ sơ thẻ sinh viên của bạn trên hệ thống <strong>SkillBridge</strong> đã được Ban quản trị phê duyệt thành công.</p>
    <div style=""background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;"">
        <p><strong>Trường:</strong> {safeSchoolName}</p>
        <p><strong>Mã số sinh viên (MSSV):</strong> {safeStudentCode}</p>
        <p><strong>Họ và tên:</strong> {safeFullName}</p>
        <p><strong>Năm tốt nghiệp dự kiến:</strong> {request.GraduationYear}</p>
        <p><strong>Thời gian duyệt:</strong> {DateTime.UtcNow:dd/MM/yyyy HH:mm} UTC</p>
    </div>
    <p>Tài khoản của bạn đã được gắn huy hiệu <strong>Sinh viên đã xác thực (Verified Student)</strong>. Giờ đây bạn có thể mở khóa toàn bộ quyền ứng tuyển các công việc sinh viên và nhận thanh toán thù lao an toàn qua SkillBridge.</p>
    <hr style=""border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;"" />
    <p style=""font-size: 12px; color: #6b7280;"">Email này được gửi tự động từ Hệ thống SkillBridge. Chúc bạn có trải nghiệm tuyệt vời cùng SkillBridge!</p>
</div>";

                await _emailService.SendEmailAsync(user.Email, subject, body);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Lỗi khi gửi email duyệt thẻ sinh viên cho User {UserId}", request.UserId);
            }
        }

        private async Task SendStudentVerificationNeedInfoEmailAsync(StudentVerificationRequest request)
        {
            try
            {
                if (_emailService == null || _systemSettingService == null) return;
                var isEnabled = await _systemSettingService.IsFeatureEnabledAsync(SystemSettingService.KeyEmailStudentVerification, true);
                if (!isEnabled) return;

                var user = request.User ?? await dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == request.UserId);
                if (user == null || string.IsNullOrWhiteSpace(user.Email)) return;

                var safeFullName = WebUtility.HtmlEncode(user.FullName ?? "bạn");
                var safeUserMessage = WebUtility.HtmlEncode(request.UserMessage);
                var subject = "[SkillBridge] Yêu cầu bổ sung thông tin xác minh thẻ sinh viên";
                var body = $@"
<div style=""font-family: Arial, sans-serif; line-height: 1.6; color: #333;"">
    <h2 style=""color: #f59e0b;"">Yêu cầu bổ sung thông tin hồ sơ thẻ sinh viên ⚠️</h2>
    <p>Xin chào <strong>{safeFullName}</strong>,</p>
    <p>Ban quản trị SkillBridge đã xem xét hồ sơ xác minh thẻ sinh viên của bạn và cần bạn bổ sung hoặc cập nhật thêm thông tin:</p>
    <div style=""background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 20px 0;"">
        <p><strong>Yêu cầu từ kiểm duyệt viên:</strong> {safeUserMessage}</p>
        <p><strong>Hạn chót bổ sung:</strong> {request.NeedInfoDeadline:dd/MM/yyyy HH:mm} UTC</p>
    </div>
    <p>Vui lòng đăng nhập vào ứng dụng SkillBridge, truy cập mục <strong>Hồ sơ cá nhân / Xác minh thẻ sinh viên</strong> để chụp lại ảnh thẻ hoặc cập nhật theo hướng dẫn trước thời hạn trên.</p>
    <hr style=""border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;"" />
    <p style=""font-size: 12px; color: #6b7280;"">Email này được gửi tự động từ Hệ thống SkillBridge. Vui lòng không phản hồi email này.</p>
</div>";

                await _emailService.SendEmailAsync(user.Email, subject, body);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Lỗi khi gửi email yêu cầu bổ sung thông tin thẻ sinh viên cho User {UserId}", request.UserId);
            }
        }

        private async Task SendStudentVerificationRejectionEmailAsync(StudentVerificationRequest request)
        {
            try
            {
                if (_emailService == null || _systemSettingService == null) return;
                var isEnabled = await _systemSettingService.IsFeatureEnabledAsync(SystemSettingService.KeyEmailStudentVerification, true);
                if (!isEnabled) return;

                var user = request.User ?? await dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == request.UserId);
                if (user == null || string.IsNullOrWhiteSpace(user.Email)) return;

                var safeFullName = WebUtility.HtmlEncode(user.FullName ?? "bạn");
                var safeRejectionReason = WebUtility.HtmlEncode(request.RejectionReason);
                var subject = "[SkillBridge] Thông báo kết quả xác minh thẻ sinh viên";
                var body = $@"
<div style=""font-family: Arial, sans-serif; line-height: 1.6; color: #333;"">
    <h2 style=""color: #ef4444;"">Hồ sơ xác minh thẻ sinh viên không được duyệt</h2>
    <p>Xin chào <strong>{safeFullName}</strong>,</p>
    <p>Ban quản trị SkillBridge đã xem xét hồ sơ thẻ sinh viên của bạn nhưng rất tiếc chưa thể phê duyệt do thông tin không đạt yêu cầu tiêu chuẩn:</p>
    <div style=""background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 4px; margin: 20px 0;"">
        <p><strong>Lý do từ chối:</strong> {safeRejectionReason}</p>
    </div>
    <p>Vui lòng đăng nhập vào SkillBridge để nộp lại ảnh chụp thẻ sinh viên rõ nét, còn hạn sử dụng hoặc liên hệ đội ngũ hỗ trợ nếu bạn cần thêm thông tin.</p>
    <hr style=""border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;"" />
    <p style=""font-size: 12px; color: #6b7280;"">Email này được gửi tự động từ Hệ thống SkillBridge. Vui lòng không phản hồi email này.</p>
</div>";

                await _emailService.SendEmailAsync(user.Email, subject, body);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Lỗi khi gửi email từ chối thẻ sinh viên cho User {UserId}", request.UserId);
            }
        }
    }
}
