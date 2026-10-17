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

/// <summary>
/// Cài đặt dịch vụ Quản lý Giao dịch cho Admin: liệt kê, lọc và thống kê toàn bộ
/// bảng transactions (nạp tiền, giữ/hoàn tiền rút, hoa hồng, phí gói, quảng cáo,
/// hoàn bảo hiểm, thưởng giới thiệu...). Chỉ đọc, không chỉnh sửa số liệu đã ghi nhận.
/// </summary>
public class AdminTransactionService : IAdminTransactionService
{
    private readonly SkillBridgeDbContext _dbContext;

    public AdminTransactionService(SkillBridgeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<AdminTransactionPagedResultDto> GetListAsync(
        string? type = null,
        int? userId = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? keyword = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 20;

        var query = BuildFilteredQuery(type, userId, fromDate, toDate, keyword);

        var totalCount = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new AdminTransactionItemDto
            {
                Id = t.Id,
                UserId = t.UserId,
                UserName = t.User != null ? t.User.FullName : null,
                UserEmail = t.User != null ? t.User.Email : null,
                Type = t.Type,
                Label = t.Label,
                Amount = t.Amount,
                Sign = t.Sign,
                ReferenceId = t.ReferenceId,
                CreatedAt = t.CreatedAt
            })
            .ToListAsync(ct);

        return new AdminTransactionPagedResultDto
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<AdminTransactionSummaryDto> GetSummaryAsync(
        DateTime? fromDate = null,
        DateTime? toDate = null,
        CancellationToken ct = default)
    {
        var query = BuildFilteredQuery(null, null, fromDate, toDate, null);

        var totalCount = await query.CountAsync(ct);

        var totalInflow = await query
            .Where(t => t.Sign > 0)
            .SumAsync(t => (decimal?)t.Amount, ct) ?? 0m;

        var totalOutflow = await query
            .Where(t => t.Sign < 0)
            .SumAsync(t => (decimal?)t.Amount, ct) ?? 0m;

        var byType = await query
            .GroupBy(t => t.Type)
            .Select(g => new AdminTransactionTypeBreakdownDto
            {
                Type = g.Key,
                Count = g.Count(),
                TotalAmount = g.Sum(t => t.Amount * t.Sign)
            })
            .OrderByDescending(b => b.Count)
            .ToListAsync(ct);

        return new AdminTransactionSummaryDto
        {
            TotalInflow = totalInflow,
            TotalOutflow = totalOutflow,
            NetAmount = totalInflow - totalOutflow,
            TotalCount = totalCount,
            ByType = byType
        };
    }

    private IQueryable<Data.Entities.Transaction> BuildFilteredQuery(
        string? type,
        int? userId,
        DateTime? fromDate,
        DateTime? toDate,
        string? keyword)
    {
        var query = _dbContext.Transactions
            .AsNoTracking()
            .Include(t => t.User)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(type) && !string.Equals(type.Trim(), "all", StringComparison.OrdinalIgnoreCase))
        {
            var normalizedType = type.Trim().ToLowerInvariant();
            query = query.Where(t => t.Type == normalizedType);
        }

        if (userId.HasValue && userId.Value > 0)
        {
            query = query.Where(t => t.UserId == userId.Value);
        }

        if (fromDate.HasValue)
        {
            query = query.Where(t => t.CreatedAt >= fromDate.Value);
        }

        if (toDate.HasValue)
        {
            // Bao gồm trọn ngày kết thúc
            var inclusiveToDate = toDate.Value.Date.AddDays(1);
            query = query.Where(t => t.CreatedAt < inclusiveToDate);
        }

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var trimmedKeyword = keyword.Trim();
            query = query.Where(t =>
                t.Label.Contains(trimmedKeyword) ||
                (t.User != null && (t.User.FullName.Contains(trimmedKeyword) || t.User.Email.Contains(trimmedKeyword))));
        }

        return query;
    }
}
