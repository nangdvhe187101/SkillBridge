using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Reports;
using SkillBridge.Application.Interfaces.Reports;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Services.Reports;

public class ReportService : IReportService
{
    private readonly SkillBridgeDbContext _dbContext;
    private readonly ILogger<ReportService> _logger;

    public ReportService(SkillBridgeDbContext dbContext, ILogger<ReportService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task<ReportResponse> CreateReportAsync(int reporterId, CreateReportRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            throw new BusinessException("Lý do báo cáo không được để trống.");
        }

        int? targetJobId = null;
        int? targetUserId = null;

        if (string.Equals(request.TargetType, "job", StringComparison.OrdinalIgnoreCase))
        {
            targetJobId = request.TargetId;
        }
        else if (string.Equals(request.TargetType, "user", StringComparison.OrdinalIgnoreCase))
        {
            targetUserId = request.TargetId;
        }

        var report = new Report
        {
            ReporterId = reporterId,
            TargetJobId = targetJobId,
            TargetUserId = targetUserId,
            Reason = request.Reason.Trim(),
            Description = request.Description?.Trim(),
            Status = "pending",
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Reports.Add(report);
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Người dùng {ReporterId} đã gửi báo cáo vi phạm #{ReportId} cho {TargetType} #{TargetId}.",
            reporterId, report.Id, request.TargetType, request.TargetId);

        return new ReportResponse
        {
            Id = report.Id,
            ReporterId = report.ReporterId,
            TargetJobId = report.TargetJobId,
            TargetUserId = report.TargetUserId,
            Reason = report.Reason,
            Description = report.Description,
            Status = report.Status,
            CreatedAt = report.CreatedAt
        };
    }
}
