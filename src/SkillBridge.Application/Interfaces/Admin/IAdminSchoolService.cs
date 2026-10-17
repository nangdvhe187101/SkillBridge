using System.Collections.Generic;
using System.Threading.Tasks;
using SkillBridge.Application.DTOs.Admin;

namespace SkillBridge.Application.Interfaces.Admin;

/// <summary>
/// Dịch vụ cho Admin quản lý danh sách trường đại học/cao đẳng (bảng schools) dùng
/// trong luồng xác minh thẻ sinh viên. Cho phép thêm/sửa/ẩn trường mà không cần sửa code.
/// </summary>
public interface IAdminSchoolService
{
    Task<List<AdminSchoolDto>> GetAllAsync();
    Task<AdminSchoolDto> CreateAsync(CreateAdminSchoolDto dto);
    Task<AdminSchoolDto> UpdateAsync(int id, UpdateAdminSchoolDto dto);
    Task DeleteAsync(int id);
}
