using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Admin;
using SkillBridge.Application.Interfaces.Admin;
using SkillBridge.Infrastructure.Data;
using SkillBridge.Infrastructure.Data.Entities;

namespace SkillBridge.Infrastructure.Services.Admin;

/// <summary>
/// Cài đặt dịch vụ Quản lý Trường đại học/cao đẳng cho Admin (bảng schools), dùng
/// trong luồng xác minh thẻ sinh viên. Cho phép admin tự thêm/sửa/ẩn trường mà không
/// cần sửa code mỗi lần có trường mới.
/// </summary>
public class AdminSchoolService : IAdminSchoolService
{
    private readonly SkillBridgeDbContext _dbContext;

    public AdminSchoolService(SkillBridgeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<List<AdminSchoolDto>> GetAllAsync()
    {
        return await _dbContext.Schools
            .AsNoTracking()
            .OrderBy(s => s.Name)
            .Select(s => MapToDto(s))
            .ToListAsync();
    }

    public async Task<AdminSchoolDto> CreateAsync(CreateAdminSchoolDto dto)
    {
        var trimmedName = dto.Name.Trim();
        var exists = await _dbContext.Schools.AnyAsync(s => s.Name == trimmedName);
        if (exists)
        {
            throw new BusinessException($"Trường '{trimmedName}' đã tồn tại trong danh sách.");
        }

        var school = new School
        {
            Code = string.IsNullOrWhiteSpace(dto.Code) ? null : dto.Code.Trim(),
            Name = trimmedName,
            ShortName = string.IsNullOrWhiteSpace(dto.ShortName) ? null : dto.ShortName.Trim(),
            Domain = string.IsNullOrWhiteSpace(dto.Domain) ? null : dto.Domain.Trim().ToLowerInvariant(),
            IsActive = true
        };

        await _dbContext.Schools.AddAsync(school);
        await _dbContext.SaveChangesAsync();

        return MapToDto(school);
    }

    public async Task<AdminSchoolDto> UpdateAsync(int id, UpdateAdminSchoolDto dto)
    {
        var school = await _dbContext.Schools.FirstOrDefaultAsync(s => s.Id == id)
            ?? throw new BusinessException($"Không tìm thấy trường #{id}.");

        var trimmedName = dto.Name.Trim();
        var nameTaken = await _dbContext.Schools.AnyAsync(s => s.Id != id && s.Name == trimmedName);
        if (nameTaken)
        {
            throw new BusinessException($"Trường '{trimmedName}' đã tồn tại trong danh sách.");
        }

        school.Code = string.IsNullOrWhiteSpace(dto.Code) ? null : dto.Code.Trim();
        school.Name = trimmedName;
        school.ShortName = string.IsNullOrWhiteSpace(dto.ShortName) ? null : dto.ShortName.Trim();
        school.Domain = string.IsNullOrWhiteSpace(dto.Domain) ? null : dto.Domain.Trim().ToLowerInvariant();
        school.IsActive = dto.IsActive;

        await _dbContext.SaveChangesAsync();

        return MapToDto(school);
    }

    public async Task DeleteAsync(int id)
    {
        var school = await _dbContext.Schools.FirstOrDefaultAsync(s => s.Id == id)
            ?? throw new BusinessException($"Không tìm thấy trường #{id}.");

        // Không xóa cứng nếu trường đang được sinh viên tham chiếu (User/StudentProfile/yêu cầu xác minh),
        // tránh vi phạm khóa ngoại và mất dữ liệu lịch sử. Chỉ cho ẩn (IsActive = false) trong trường hợp này.
        var inUse = await _dbContext.Users.AnyAsync(u => u.SchoolId == id)
            || await _dbContext.StudentProfiles.AnyAsync(p => p.SchoolId == id)
            || await _dbContext.StudentVerificationRequests.AnyAsync(r => r.SchoolId == id);

        if (inUse)
        {
            throw new BusinessException("Trường này đang có sinh viên hoặc hồ sơ xác minh tham chiếu, không thể xóa. Hãy chuyển sang ẩn (ngừng hoạt động) thay vì xóa.");
        }

        _dbContext.Schools.Remove(school);
        await _dbContext.SaveChangesAsync();
    }

    private static AdminSchoolDto MapToDto(School s) => new()
    {
        Id = s.Id,
        Code = s.Code,
        Name = s.Name,
        ShortName = s.ShortName,
        Domain = s.Domain,
        IsActive = s.IsActive
    };
}
