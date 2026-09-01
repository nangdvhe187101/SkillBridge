using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Jobs;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;
using SkillBridge.Infrastructure.Repositories.Interfaces;

namespace SkillBridge.Infrastructure.Repositories.Implementations;

public class JobRepository : IJobRepository
{
    private readonly SkillBridgeDbContext _context;

    public JobRepository(SkillBridgeDbContext context)
    {
        _context = context;
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
            PostedAt = job.Job.PostedAt,
            DeadlineAt = job.Job.DeadlineAt,
            CategoryId = job.Job.CategoryId,
            CategoryName = job.CategoryName,
            EmployerId = job.Employer.Id,
            EmployerName = job.Employer.FullName,
            EmployerAvatar = job.Employer.AvatarUrl,
            EmployerCompanyDescription = job.Employer.CompanyDescription,
            EmployerIndustry = job.Employer.Industry,
            EmployerCompanySize = job.Employer.CompanySize,
            EmployerWebsite = job.Employer.Website,
            EmployerReliabilityScore = job.Employer.ReliabilityScore,
            IsSaved = job.IsSaved,
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
                FileUrl = a.FileUrl,
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
                IsSaved = currentUserId.HasValue && j.SavedJobs.Any(s => s.StudentId == currentUserId.Value)
            })
            .ToListAsync();

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
                IsSaved = false
            })
            .ToListAsync();

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

            // Tăng category job_count đồng bộ
            await _context.Categories
                .Where(c => c.Id == job.CategoryId)
                .ExecuteUpdateAsync(s => s.SetProperty(c => c.JobCount, c => c.JobCount + 1));

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

    public async Task CancelJobAsync(Job job)
    {
        await using var tx = await _context.Database.BeginTransactionAsync();
        try
        {
            job.Status = "cancelled";
            job.UpdatedAt = DateTime.UtcNow;
            _context.Jobs.Update(job);
            await _context.SaveChangesAsync();

            // Giảm category job_count đồng bộ (không để âm)
            await _context.Categories
                .Where(c => c.Id == job.CategoryId && c.JobCount > 0)
                .ExecuteUpdateAsync(s => s.SetProperty(c => c.JobCount, c => c.JobCount - 1));

            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
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
                IsSaved = true
            })
            .ToListAsync();

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
