using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SkillBridge.Application.DTOs.Admin;
using SkillBridge.Application.Interfaces.Admin;
using SkillBridge.Infrastructure.Data;

namespace SkillBridge.Infrastructure.Services.Admin;

public class AdminAnalyticsService : IAdminAnalyticsService
{
    private readonly SkillBridgeDbContext _dbContext;

    public AdminAnalyticsService(SkillBridgeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<AdminAnalyticsOverviewDto> GetOverviewAsync(CancellationToken ct = default)
    {
        // 1. Thống kê Người dùng (Chỉ lấy tài khoản người dùng, loại trừ tài khoản admin)
        var usersQuery = _dbContext.Users.AsNoTracking().Where(u => u.Role.Type == "user");

        var totalUsers = await usersQuery.CountAsync(ct);
        var studentsCount = await usersQuery.CountAsync(u => u.Role.Code == "student", ct);
        var employersCount = await usersQuery.CountAsync(u => u.Role.Code == "employer", ct);
        var verifiedKycCount = await usersQuery.CountAsync(u => u.KycStatus == "verified", ct);
        var pendingKycCount = await usersQuery.CountAsync(u => u.KycStatus == "pending", ct);

        // 2. Thống kê Công việc & Hợp đồng
        var jobsQuery = _dbContext.Jobs.AsNoTracking();
        var totalJobs = await jobsQuery.CountAsync(ct);
        var openJobs = await jobsQuery.CountAsync(j => j.Status == "open", ct);
        var inProgressJobs = await jobsQuery.CountAsync(j => j.Status == "in_progress" || j.Status == "submitted" || j.Status == "revision_requested", ct);
        var completedJobs = await jobsQuery.CountAsync(j => j.Status == "completed", ct);
        var cancelledJobs = await jobsQuery.CountAsync(j => j.Status == "cancelled" || j.Status == "closed", ct);

        var completionRate = totalJobs > 0
            ? Math.Round((double)completedJobs / totalJobs * 100, 1)
            : 0.0;

        // 3. Thống kê Tài chính thực tế
        var totalEscrow = await jobsQuery
            .Where(j => j.HiredApplicantId != null && (j.Status == "in_progress" || j.Status == "submitted" || j.Status == "revision_requested"))
            .SumAsync(j => (decimal?)(j.EscrowAmount ?? j.Budget), ct) ?? 0m;

        var totalWallets = await _dbContext.Wallets.AsNoTracking()
            .SumAsync(w => (decimal?)w.Balance, ct) ?? 0m;

        // 4. Thống kê phân bố theo Trường Đại học của sinh viên
        var rawSchools = await usersQuery
            .Where(u => u.Role.Code == "student" && !string.IsNullOrWhiteSpace(u.School))
            .GroupBy(u => u.School!.Trim())
            .Select(g => new
            {
                SchoolName = g.Key,
                Count = g.Count()
            })
            .OrderByDescending(x => x.Count)
            .Take(6)
            .ToListAsync(ct);

        var schoolStats = rawSchools.Select(s => new AdminSchoolStatDto
        {
            SchoolName = s.SchoolName,
            StudentCount = s.Count,
            Percentage = studentsCount > 0 ? Math.Round((double)s.Count / studentsCount * 100, 1) : 0
        }).ToList();

        // 5. Phân bổ trạng thái công việc (Breakdown)
        var statusBreakdown = new List<AdminJobStatusBreakdownDto>
        {
            new()
            {
                Status = "open",
                Label = "Đang tuyển ứng viên",
                Count = openJobs,
                Percentage = totalJobs > 0 ? Math.Round((double)openJobs / totalJobs * 100, 1) : 0,
                Color = "#2563eb"
            },
            new()
            {
                Status = "in_progress",
                Label = "Đang thực hiện",
                Count = inProgressJobs,
                Percentage = totalJobs > 0 ? Math.Round((double)inProgressJobs / totalJobs * 100, 1) : 0,
                Color = "#16a34a"
            },
            new()
            {
                Status = "completed",
                Label = "Đã hoàn thành",
                Count = completedJobs,
                Percentage = totalJobs > 0 ? Math.Round((double)completedJobs / totalJobs * 100, 1) : 0,
                Color = "#7c3aed"
            },
            new()
            {
                Status = "cancelled",
                Label = "Đã đóng / Hủy",
                Count = cancelledJobs,
                Percentage = totalJobs > 0 ? Math.Round((double)cancelledJobs / totalJobs * 100, 1) : 0,
                Color = "#dc2626"
            }
        };

        return new AdminAnalyticsOverviewDto
        {
            TotalUsers = totalUsers,
            StudentsCount = studentsCount,
            EmployersCount = employersCount,
            VerifiedKycCount = verifiedKycCount,
            PendingKycCount = pendingKycCount,

            TotalJobs = totalJobs,
            OpenJobsCount = openJobs,
            InProgressJobsCount = inProgressJobs,
            CompletedJobsCount = completedJobs,
            CancelledJobsCount = cancelledJobs,
            CompletionRate = completionRate,

            TotalEscrowVolume = totalEscrow,
            TotalWalletBalances = totalWallets,

            TopSchools = schoolStats,
            JobStatusBreakdown = statusBreakdown
        };
    }
}
