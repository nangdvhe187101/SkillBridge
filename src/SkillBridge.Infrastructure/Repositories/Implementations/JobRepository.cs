using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Jobs;
using SkillBridge.Application.Interfaces.Storage;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Repositories.Interfaces;

namespace SkillBridge.Infrastructure.Repositories.Implementations;

public class JobRepository : IJobRepository
{
    private readonly SkillBridgeDbContext _context;
    private readonly IStorageService _storageService;

    public JobRepository(SkillBridgeDbContext context, IStorageService storageService)
    {
        _context = context;
        _storageService = storageService;
    }

    public async Task<Job?> GetByIdAsync(int id)
    {
        return await _context.Jobs
            .Include(j => j.Category)
            .Include(j => j.JobRequirements)
            .FirstOrDefaultAsync(j => j.Id == id);
    }

    public async Task<JobDetailDto?> GetJobDetailDtoAsync(int id, int? currentUserId = null)
    {
        var job = await _context.Jobs
            .AsNoTracking()
            .Where(j => j.Id == id)
            .Select(j => new
            {
                Job = j,
                CategoryName = j.Category.Name,
                Employer = j.Employer,
                HiredStudentName = j.HiredApplicant != null ? j.HiredApplicant.FullName : null,
                Requirements = j.JobRequirements.OrderBy(r => r.SortOrder).ToList(),
                Attachments = j.Attachments.OrderBy(a => a.CreatedAt).ToList(),
                IsSaved = currentUserId.HasValue && j.SavedJobs.Any(s => s.StudentId == currentUserId.Value)
            })
            .FirstOrDefaultAsync();

        if (job == null) return null;

        return new JobDetailDto
        {
            Id = job.Job.Id,
            Title = job.Job.Title,
            Description = job.Job.Description,
            Location = job.Job.Location,
            Budget = job.Job.Budget,
            IsUrgent = job.Job.IsUrgent,
            IsFeatured = job.Job.IsFeatured,
            Status = job.Job.Status,
            RevisionLimit = job.Job.RevisionLimit,
            RevisionCount = job.Job.RevisionCount,
            PostedAt = job.Job.PostedAt,
            DeadlineAt = job.Job.DeadlineAt,
            CategoryId = job.Job.CategoryId,
            CategoryName = job.CategoryName,
            EmployerId = job.Employer.Id,
            EmployerName = job.Employer.FullName,
            EmployerAvatar = _storageService.GetPublicUrl(job.Employer.AvatarUrl),
            EmployerCompanyDescription = job.Employer.CompanyDescription,
            EmployerIndustry = job.Employer.Industry,
            EmployerCompanySize = job.Employer.CompanySize,
            EmployerWebsite = job.Employer.Website,
            EmployerReliabilityScore = job.Employer.ReliabilityScore,
            IsSaved = job.IsSaved,
            HiredApplicantId = job.Job.HiredApplicantId,
            HiredStudentName = job.HiredStudentName,
            EscrowAmount = (job.Job.Status == "in_progress" || job.Job.Status == "submitted" || job.Job.Status == "revision_requested")
                ? (job.Job.EscrowAmount ?? (job.Job.HiredApplicantId.HasValue ? job.Job.Budget : null))
                : null,
            Requirements = job.Requirements.Select(r => new JobRequirementDto
            {
                Id = r.Id,
                RequirementText = r.RequirementText,
                SortOrder = r.SortOrder
            }).ToList(),
            Attachments = job.Attachments.Select(a => new JobAttachmentDto
            {
                Id = a.Id,
                JobId = a.JobId,
                FileName = a.FileName,
                FileUrl = _storageService.GetPublicUrl(a.FileUrl),
                FileSize = a.FileSize,
                FileType = a.FileType,
                CreatedAt = a.CreatedAt
            }).ToList()
        };
    }

    public async Task<PagedResult<JobSummaryDto>> GetPublicJobsPagedAsync(JobQueryParameters query, int? currentUserId = null)
    {
        // 1. Tận dụng index idx_jobs_status_category (Status = 'open', CategoryId)
        var queryable = _context.Jobs
            .AsNoTracking()
            .Where(j => j.Status == "open" && j.Employer.AccountStatus != "blacklisted");

        if (query.CategoryId.HasValue && query.CategoryId.Value > 0)
        {
            queryable = queryable.Where(j => j.CategoryId == query.CategoryId.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.Location))
        {
            queryable = queryable.Where(j => j.Location != null && j.Location.Contains(query.Location));
        }

        if (query.MinBudget.HasValue)
        {
            queryable = queryable.Where(j => j.Budget >= query.MinBudget.Value);
        }

        if (query.MaxBudget.HasValue)
        {
            queryable = queryable.Where(j => j.Budget <= query.MaxBudget.Value);
        }

        if (query.IsUrgent.HasValue)
        {
            queryable = queryable.Where(j => j.IsUrgent == query.IsUrgent.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var searchPattern = query.Search.Trim();
            if (searchPattern.Length >= 3)
            {
                queryable = queryable.Where(j => EF.Functions.Match(new[] { j.Title, j.Description }, searchPattern, MySqlMatchSearchMode.NaturalLanguage) > 0);
            }
            else
            {
                queryable = queryable.Where(j => j.Title.Contains(searchPattern) || j.Description.Contains(searchPattern));
            }
        }

        // Sorting
        queryable = query.Sort switch
        {
            "budget_asc" => queryable.OrderBy(j => j.Budget).ThenByDescending(j => j.PostedAt),
            "budget_desc" => queryable.OrderByDescending(j => j.Budget).ThenByDescending(j => j.PostedAt),
            _ => queryable.OrderByDescending(j => j.PostedAt) // Default newest
        };

        var page = query.Page <= 0 ? 1 : query.Page;
        var pageSize = query.PageSize <= 0 ? PaginationConstants.DefaultPageSize : Math.Min(query.PageSize, PaginationConstants.MaxPageSize);

        var totalCount = await queryable.CountAsync();

        var items = await queryable
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(j => new JobSummaryDto
            {
                Id = j.Id,
                Title = j.Title,
                Location = j.Location,
                Budget = j.Budget,
                IsUrgent = j.IsUrgent,
                IsFeatured = j.IsFeatured,
                Status = j.Status,
                PostedAt = j.PostedAt,
                DeadlineAt = j.DeadlineAt,
                CategoryId = j.CategoryId,
                CategoryName = j.Category.Name,
                EmployerId = j.Employer.Id,
                EmployerName = j.Employer.FullName,
                EmployerAvatar = j.Employer.AvatarUrl,
                IsSaved = currentUserId.HasValue && j.SavedJobs.Any(s => s.StudentId == currentUserId.Value),
                ApplicantCount = j.Applications.Count(),
                AttachmentCount = j.Attachments.Count(),
                HiredApplicantId = j.HiredApplicantId,
                HiredStudentName = j.HiredApplicant != null ? j.HiredApplicant.FullName : null,
                EscrowAmount = (j.Status == "in_progress" || j.Status == "submitted" || j.Status == "revision_requested")
                    ? (j.EscrowAmount ?? (j.HiredApplicantId.HasValue ? j.Budget : null))
                    : null,
                RevisionLimit = j.RevisionLimit,
                RevisionCount = j.RevisionCount
            })
            .ToListAsync();

        foreach (var item in items)
        {
            item.EmployerAvatar = _storageService.GetPublicUrl(item.EmployerAvatar);
        }

        return new PagedResult<JobSummaryDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<PagedResult<JobSummaryDto>> GetEmployerJobsPagedAsync(int employerId, string? status, int page, int pageSize)
    {
        // Tận dụng index idx_jobs_employer_status
        var queryable = _context.Jobs
            .AsNoTracking()
            .Where(j => j.EmployerId == employerId);

        if (!string.IsNullOrWhiteSpace(status))
        {
            queryable = queryable.Where(j => j.Status == status);
        }

        queryable = queryable.OrderByDescending(j => j.PostedAt);

        page = page <= 0 ? 1 : page;
        pageSize = pageSize <= 0 ? PaginationConstants.DefaultPageSize : Math.Min(pageSize, PaginationConstants.MaxPageSize);

        var totalCount = await queryable.CountAsync();

        var items = await queryable
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(j => new JobSummaryDto
            {
                Id = j.Id,
                Title = j.Title,
                Location = j.Location,
                Budget = j.Budget,
                IsUrgent = j.IsUrgent,
                IsFeatured = j.IsFeatured,
                Status = j.Status,
                PostedAt = j.PostedAt,
                DeadlineAt = j.DeadlineAt,
                CategoryId = j.CategoryId,
                CategoryName = j.Category.Name,
                EmployerId = j.Employer.Id,
                EmployerName = j.Employer.FullName,
                EmployerAvatar = j.Employer.AvatarUrl,
                IsSaved = false,
                ApplicantCount = j.Applications.Count(),
                AttachmentCount = j.Attachments.Count(),
                HiredApplicantId = j.HiredApplicantId,
                HiredStudentName = j.HiredApplicant != null ? j.HiredApplicant.FullName : null,
                EscrowAmount = (j.Status == "in_progress" || j.Status == "submitted" || j.Status == "revision_requested")
                    ? (j.EscrowAmount ?? (j.HiredApplicantId.HasValue ? j.Budget : null))
                    : null,
                RevisionLimit = j.RevisionLimit,
                RevisionCount = j.RevisionCount
            })
            .ToListAsync();

        foreach (var item in items)
        {
            item.EmployerAvatar = _storageService.GetPublicUrl(item.EmployerAvatar);
        }

        return new PagedResult<JobSummaryDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<Job> CreateJobWithRequirementsAsync(Job job, List<string> requirements)
    {
        await using var tx = await _context.Database.BeginTransactionAsync();
        try
        {
            job.PostedAt = DateTime.UtcNow;
            job.UpdatedAt = DateTime.UtcNow;
            await _context.Jobs.AddAsync(job);
            await _context.SaveChangesAsync();

            if (requirements != null && requirements.Count > 0)
            {
                var reqEntities = requirements
                    .Where(r => !string.IsNullOrWhiteSpace(r))
                    .Select((r, idx) => new JobRequirement
                    {
                        JobId = job.Id,
                        RequirementText = r.Trim(),
                        SortOrder = idx + 1
                    })
                    .ToList();

                if (reqEntities.Count > 0)
                {
                    await _context.JobRequirements.AddRangeAsync(reqEntities);
                    await _context.SaveChangesAsync();
                }
            }

            await tx.CommitAsync();
            return job;
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task UpdateJobWithRequirementsAsync(Job job, List<string> requirements)
    {
        await using var tx = await _context.Database.BeginTransactionAsync();
        try
        {
            job.UpdatedAt = DateTime.UtcNow;
            _context.Jobs.Update(job);

            // Xóa requirements cũ và thêm mới
            var existingRequirements = await _context.JobRequirements
                .Where(r => r.JobId == job.Id)
                .ToListAsync();

            if (existingRequirements.Count > 0)
            {
                _context.JobRequirements.RemoveRange(existingRequirements);
            }

            if (requirements != null && requirements.Count > 0)
            {
                var reqEntities = requirements
                    .Where(r => !string.IsNullOrWhiteSpace(r))
                    .Select((r, idx) => new JobRequirement
                    {
                        JobId = job.Id,
                        RequirementText = r.Trim(),
                        SortOrder = idx + 1
                    })
                    .ToList();

                if (reqEntities.Count > 0)
                {
                    await _context.JobRequirements.AddRangeAsync(reqEntities);
                }
            }

            await _context.SaveChangesAsync();
            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task UpdateJobAsync(Job job)
    {
        job.UpdatedAt = DateTime.UtcNow;
        _context.Jobs.Update(job);
        await _context.SaveChangesAsync();
    }

    public async Task CancelJobAsync(Job job)
    {
        await using var tx = await _context.Database.BeginTransactionAsync();
        try
        {
            job.Status = "cancelled";
            job.HiredApplicantId = null;
            job.EscrowAmount = null;
            job.DeadlineAt = null;
            job.RevisionCount = 0;
            job.UpdatedAt = DateTime.UtcNow;
            _context.Jobs.Update(job);
            await _context.SaveChangesAsync();

            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task ReopenJobAsync(Job job)
    {
        await using var tx = await _context.Database.BeginTransactionAsync();
        try
        {
            job.Status = "open";
            job.HiredApplicantId = null;
            job.EscrowAmount = null;
            job.DeadlineAt = null;
            job.RevisionCount = 0;
            job.UpdatedAt = DateTime.UtcNow;
            _context.Jobs.Update(job);
            await _context.SaveChangesAsync();

            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task DeleteJobAsync(Job job)
    {
        var strategy = _context.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. Dọn dẹp JobAttachments
                var attachments = await _context.JobAttachments.Where(a => a.JobId == job.Id).ToListAsync();
                if (attachments.Count > 0)
                {
                    _context.JobAttachments.RemoveRange(attachments);
                }

                // 2. Dọn dẹp JobRequirements
                var reqs = await _context.JobRequirements.Where(r => r.JobId == job.Id).ToListAsync();
                if (reqs.Count > 0)
                {
                    _context.JobRequirements.RemoveRange(reqs);
                }

                // 3. Dọn dẹp Disputes & DisputeEvidences liên quan
                var disputes = await _context.Disputes.Where(d => d.JobId == job.Id).ToListAsync();
                if (disputes.Count > 0)
                {
                    var disputeIds = disputes.Select(d => d.Id).ToList();
                    var evidences = await _context.DisputeEvidences
                        .Where(e => disputeIds.Contains(e.DisputeId))
                        .ToListAsync();
                    if (evidences.Count > 0)
                    {
                        _context.DisputeEvidences.RemoveRange(evidences);
                    }

                    var disputeLedgers = await _context.InsuranceFundLedgers
                        .Where(l => l.DisputeId.HasValue && disputeIds.Contains(l.DisputeId.Value))
                        .ToListAsync();
                    if (disputeLedgers.Count > 0)
                    {
                        _context.InsuranceFundLedgers.RemoveRange(disputeLedgers);
                    }

                    _context.Disputes.RemoveRange(disputes);
                }

                // 4. Dọn dẹp JobDeliverables & DeliverableFeedbacks
                var deliverables = await _context.JobDeliverables.Where(d => d.JobId == job.Id).ToListAsync();
                if (deliverables.Count > 0)
                {
                    var deliverableIds = deliverables.Select(d => d.Id).ToList();
                    var feedbacks = await _context.DeliverableFeedbacks
                        .Where(f => deliverableIds.Contains(f.DeliverableId))
                        .ToListAsync();
                    if (feedbacks.Count > 0)
                    {
                        _context.DeliverableFeedbacks.RemoveRange(feedbacks);
                    }

                    _context.JobDeliverables.RemoveRange(deliverables);
                }

                // 5. Dọn dẹp InsuranceFundClaims & Ledgers
                var claims = await _context.InsuranceFundClaims.Where(c => c.JobId == job.Id).ToListAsync();
                if (claims.Count > 0)
                {
                    var claimIds = claims.Select(c => c.Id).ToList();
                    var ledgers = await _context.InsuranceFundLedgers
                        .Where(l => l.ClaimId.HasValue && claimIds.Contains(l.ClaimId.Value))
                        .ToListAsync();
                    if (ledgers.Count > 0)
                    {
                        _context.InsuranceFundLedgers.RemoveRange(ledgers);
                    }

                    _context.InsuranceFundClaims.RemoveRange(claims);
                }

                // 6. Kiểm tra an toàn bảo vệ chứng từ kế toán: Tuyệt đối không xóa Receipt
                var hasReceipts = await _context.Receipts.AnyAsync(r => r.JobId == job.Id);
                if (hasReceipts)
                {
                    throw new InvalidOperationException($"Không thể xóa Job #{job.Id} vì có chứng từ biên nhận (Receipt) liên kết.");
                }

                // 7. Dọn dẹp Reviews (Đánh giá hoàn thành công việc)
                var reviews = await _context.Reviews.Where(r => r.JobId == job.Id).ToListAsync();
                if (reviews.Count > 0)
                {
                    _context.Reviews.RemoveRange(reviews);
                }

                // 8. Dọn dẹp FeaturedRequests
                var featured = await _context.FeaturedRequests.Where(f => f.JobId == job.Id).ToListAsync();
                if (featured.Count > 0)
                {
                    _context.FeaturedRequests.RemoveRange(featured);
                }

                // 9. Dọn dẹp ModerationQueues
                var modQueues = await _context.ModerationQueues.Where(m => m.JobId == job.Id).ToListAsync();
                if (modQueues.Count > 0)
                {
                    _context.ModerationQueues.RemoveRange(modQueues);
                }

                // 10. Gỡ liên kết JobId trong Conversations (bảo tồn hội thoại của người dùng)
                var convs = await _context.Conversations.Where(c => c.JobId == job.Id).ToListAsync();
                foreach (var c in convs)
                {
                    c.JobId = null;
                }

                // 11. Gỡ liên kết JobId trong ReliabilityEvents
                var relEvents = await _context.ReliabilityEvents.Where(r => r.JobId == job.Id).ToListAsync();
                foreach (var r in relEvents)
                {
                    r.JobId = null;
                }

                // 12. Gỡ liên kết TargetJobId trong Reports
                var reports = await _context.Reports.Where(r => r.TargetJobId == job.Id).ToListAsync();
                foreach (var r in reports)
                {
                    r.TargetJobId = null;
                }

                // 13. Dọn dẹp Applications
                var apps = await _context.Applications.Where(a => a.JobId == job.Id).ToListAsync();
                if (apps.Count > 0)
                {
                    _context.Applications.RemoveRange(apps);
                }

                // 14. Dọn dẹp SavedJobs
                var saved = await _context.SavedJobs.Where(s => s.JobId == job.Id).ToListAsync();
                if (saved.Count > 0)
                {
                    _context.SavedJobs.RemoveRange(saved);
                }

                // 15. Xóa Job chính
                _context.Jobs.Remove(job);
                await _context.SaveChangesAsync();
                await tx.CommitAsync();
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        });
    }

    public async Task<bool> SaveJobAsync(int studentId, int jobId)
    {
        var exists = await _context.SavedJobs.AnyAsync(s => s.StudentId == studentId && s.JobId == jobId);
        if (exists) return true;

        try
        {
            var savedJob = new SavedJob
            {
                StudentId = studentId,
                JobId = jobId,
                SavedAt = DateTime.UtcNow
            };
            await _context.SavedJobs.AddAsync(savedJob);
            await _context.SaveChangesAsync();
            return true;
        }
        catch (DbUpdateException)
        {
            // Tránh race condition do unique index (StudentId, JobId)
            return true;
        }
    }

    public async Task<bool> UnsaveJobAsync(int studentId, int jobId)
    {
        var saved = await _context.SavedJobs.FirstOrDefaultAsync(s => s.StudentId == studentId && s.JobId == jobId);
        if (saved != null)
        {
            _context.SavedJobs.Remove(saved);
            await _context.SaveChangesAsync();
        }
        return true;
    }

    public async Task<PagedResult<JobSummaryDto>> GetSavedJobsPagedAsync(int studentId, int page, int pageSize)
    {
        page = page <= 0 ? 1 : page;
        pageSize = pageSize <= 0 ? PaginationConstants.DefaultPageSize : Math.Min(pageSize, PaginationConstants.MaxPageSize);

        var queryable = _context.SavedJobs
            .AsNoTracking()
            .Where(s => s.StudentId == studentId)
            .OrderByDescending(s => s.SavedAt)
            .Select(s => s.Job);

        var totalCount = await queryable.CountAsync();

        var items = await queryable
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(j => new JobSummaryDto
            {
                Id = j.Id,
                Title = j.Title,
                Location = j.Location,
                Budget = j.Budget,
                IsUrgent = j.IsUrgent,
                IsFeatured = j.IsFeatured,
                Status = j.Status,
                PostedAt = j.PostedAt,
                DeadlineAt = j.DeadlineAt,
                CategoryId = j.CategoryId,
                CategoryName = j.Category.Name,
                EmployerId = j.Employer.Id,
                EmployerName = j.Employer.FullName,
                EmployerAvatar = j.Employer.AvatarUrl,
                IsSaved = true,
                AttachmentCount = j.Attachments.Count(),
                HiredApplicantId = j.HiredApplicantId,
                HiredStudentName = j.HiredApplicant != null ? j.HiredApplicant.FullName : null,
                EscrowAmount = (j.Status == "in_progress" || j.Status == "submitted" || j.Status == "revision_requested")
                    ? (j.EscrowAmount ?? (j.HiredApplicantId.HasValue ? j.Budget : null))
                    : null,
                RevisionLimit = j.RevisionLimit,
                RevisionCount = j.RevisionCount
            })
            .ToListAsync();

        foreach (var item in items)
        {
            item.EmployerAvatar = _storageService.GetPublicUrl(item.EmployerAvatar);
        }

        return new PagedResult<JobSummaryDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<IReadOnlyList<int>> GetSavedJobIdsAsync(int studentId)
    {
        return await _context.SavedJobs
            .AsNoTracking()
            .Where(s => s.StudentId == studentId)
            .Select(s => s.JobId)
            .ToListAsync();
    }
}
