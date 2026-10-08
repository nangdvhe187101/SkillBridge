using System;
using System.Collections.Generic;
using System.IO;
using System.Diagnostics;
using System.Net.Http;
using System.Text.Json;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs;
using SkillBridge.Application.Interfaces;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Services.Users
{
    public class StudentVerificationService : IStudentVerificationService
    {
        private readonly SkillBridgeDbContext dbContext;
        private readonly ILogger<StudentVerificationService> logger;

        public StudentVerificationService(
            SkillBridgeDbContext _dbContext,
            ILogger<StudentVerificationService> _logger)
        {
            dbContext = _dbContext;
            logger = _logger;
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
                FrontCardUrl = frontDoc?.FileUrl,
                BackCardUrl = backDoc?.FileUrl
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
                    FrontCardUrl = frontDoc?.FileUrl,
                    BackCardUrl = backDoc?.FileUrl
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

            var decision = dto.Decision.Trim().ToLowerInvariant();

            if (decision == "approve")
            {
                request.Status = "approved";
                request.ReviewedByAdminId = adminId;
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
                    request.GraduationYear = dto.GraduationYear.Value;
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

                // Tính hạn mốc hết năm tốt nghiệp: YYYY-12-31 23:59:59
                var expiresAt = new DateTime(request.GraduationYear, 12, 31, 23, 59, 59, DateTimeKind.Utc);

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
                await dbContext.Notifications.AddAsync(new Notification
                {
                    UserId = request.UserId,
                    Title = "Xác minh thẻ sinh viên thành công",
                    MessageText = $"Chúc mừng bạn! Hồ sơ xác minh thẻ sinh viên trường {request.School?.Name} đã được phê duyệt. Bạn đã mở khóa toàn bộ quyền ứng tuyển và rút tiền.",
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
                        await dbContext.Notifications.AddAsync(new Notification
                        {
                            UserId = app.Job.EmployerId,
                            Title = "Đơn ứng tuyển mới",
                            MessageText = $"Ứng viên {request.FullNameOnCard} đã hoàn tất xác minh thẻ sinh viên và nộp đơn vào công việc: {app.Job.Title}.",
                            Type = "job_application",
                            RelatedEntityType = "applications",
                            RelatedEntityId = app.Id,
                            Link = $"/employer/jobs/{app.JobId}/applications",
                            IsRead = false,
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }
            }
            else if (decision == "need_more_info")
            {
                request.Status = "need_more_info";
                request.ReviewedByAdminId = adminId;
                request.ReviewedAt = DateTime.UtcNow;
                request.ReasonCode = dto.ReasonCode;
                request.UserMessage = dto.UserMessage ?? "Vui lòng chụp lại ảnh thẻ rõ nét hơn hoặc bổ sung giấy tờ xác minh theo yêu cầu.";
                request.AdminNote = dto.AdminNote;
                request.NeedInfoDeadline = DateTime.UtcNow.AddDays(dto.NeedInfoDeadlineDays ?? 7);

                await dbContext.Notifications.AddAsync(new Notification
                {
                    UserId = request.UserId,
                    Title = "Yêu cầu bổ sung thông tin thẻ sinh viên",
                    MessageText = request.UserMessage,
                    Type = "student_need_info",
                    RelatedEntityType = "student_verification_requests",
                    RelatedEntityId = request.Id,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                });
            }
            else if (decision == "reject")
            {
                request.Status = "rejected";
                request.ReviewedByAdminId = adminId;
                request.ReviewedAt = DateTime.UtcNow;
                request.ReasonCode = dto.ReasonCode;
                request.RejectionReason = dto.RejectionReason ?? "Hồ sơ xác minh thẻ sinh viên không đạt yêu cầu.";
                request.AdminNote = dto.AdminNote;

                // Xóa ảnh sớm hơn cho hồ sơ bị từ chối (30 ngày)
                foreach (var doc in request.Documents)
                {
                    doc.PurgeAfter = DateTime.UtcNow.AddDays(30);
                }

                await dbContext.Notifications.AddAsync(new Notification
                {
                    UserId = request.UserId,
                    Title = "Hồ sơ xác minh thẻ sinh viên bị từ chối",
                    MessageText = request.RejectionReason,
                    Type = "student_rejected",
                    RelatedEntityType = "student_verification_requests",
                    RelatedEntityId = request.Id,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                });
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
                FrontCardUrl = front?.FileUrl,
                BackCardUrl = back?.FileUrl
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
                var downloadUrl = frontDoc.FileUrl.StartsWith("http")
                    ? frontDoc.FileUrl
                    : $"http://localhost:5004{frontDoc.FileUrl}";

                using (var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(15) })
                {
                    var imageBytes = await httpClient.GetByteArrayAsync(downloadUrl, ct);
                    await File.WriteAllBytesAsync(tempImagePath, imageBytes, ct);
                }

                var ocrBinary = "/Users/vannang/Projects/SkillBridge/scripts/student_card_ocr";
                var isBinary = File.Exists(ocrBinary);

                var startInfo = new ProcessStartInfo
                {
                    FileName = isBinary ? ocrBinary : "swift",
                    Arguments = isBinary ? $"\"{tempImagePath}\"" : $"/Users/vannang/Projects/SkillBridge/scripts/student_card_ocr.swift \"{tempImagePath}\"",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using var process = new Process { StartInfo = startInfo };
                process.Start();

                var output = await process.StandardOutput.ReadToEndAsync(ct);
                var error = await process.StandardError.ReadToEndAsync(ct);
                await process.WaitForExitAsync(ct);

                if (string.IsNullOrWhiteSpace(output))
                {
                    logger.LogWarning("OCR returned empty output. Error: {Error}", error);
                    return new StudentCardOcrResultDto
                    {
                        Success = false,
                        Error = "Không thể nhận diện nội dung từ ảnh thẻ sinh viên."
                    };
                }

                using var doc = JsonDocument.Parse(output);
                var root = doc.RootElement;

                var studentCode = root.TryGetProperty("studentCode", out var sc) && sc.ValueKind == JsonValueKind.String ? sc.GetString() : null;
                var fullName = root.TryGetProperty("fullName", out var fn) && fn.ValueKind == JsonValueKind.String ? fn.GetString() : null;
                var schoolName = root.TryGetProperty("schoolName", out var sn) && sn.ValueKind == JsonValueKind.String ? sn.GetString() : null;
                int? gradYear = root.TryGetProperty("graduationYear", out var gy) && gy.ValueKind == JsonValueKind.Number ? gy.GetInt32() : null;

                var rawLines = new List<string>();
                if (root.TryGetProperty("rawLines", out var rl) && rl.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in rl.EnumerateArray())
                    {
                        var str = item.GetString();
                        if (!string.IsNullOrWhiteSpace(str)) rawLines.Add(str);
                    }
                }

                int? matchedSchoolId = null;
                if (!string.IsNullOrWhiteSpace(schoolName))
                {
                    var school = await dbContext.Schools
                        .FirstOrDefaultAsync(s => s.IsActive && (s.Name.Contains(schoolName, StringComparison.OrdinalIgnoreCase) || schoolName.Contains(s.Name, StringComparison.OrdinalIgnoreCase)), ct);
                    if (school != null)
                    {
                        matchedSchoolId = school.Id;
                        schoolName = school.Name;
                    }
                }

                request.OcrResultJson = output;
                await dbContext.SaveChangesAsync(ct);

                return new StudentCardOcrResultDto
                {
                    Success = true,
                    StudentCode = studentCode,
                    FullName = fullName,
                    SchoolName = schoolName,
                    SchoolId = matchedSchoolId,
                    GraduationYear = gradYear,
                    RawLines = rawLines
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
    }
}
