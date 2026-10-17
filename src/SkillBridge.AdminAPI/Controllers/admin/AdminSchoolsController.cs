using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Admin;
using SkillBridge.Application.Interfaces.Admin;

namespace SkillBridge.AdminAPI.Controllers.admin;

/// <summary>
/// Quản lý danh sách trường đại học/cao đẳng (bảng schools) cho Admin: thêm/sửa/xóa
/// mà không cần sửa code mỗi lần có trường mới trong luồng xác minh thẻ sinh viên.
/// </summary>
[ApiController]
[Route("api/admin/schools")]
[Authorize(Policy = "RequireAdminRole")]
public class AdminSchoolsController : ControllerBase
{
    private readonly IAdminSchoolService _schoolService;

    public AdminSchoolsController(IAdminSchoolService schoolService)
    {
        _schoolService = schoolService;
    }

    [HttpGet]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetAll()
    {
        var result = await _schoolService.GetAllAsync();
        return Ok(result);
    }

    [HttpPost]
    [EnableRateLimiting("ResourceCreationPolicy")]
    public async Task<IActionResult> Create([FromBody] CreateAdminSchoolDto dto)
    {
        try
        {
            var result = await _schoolService.CreateAsync(dto);
            return Ok(result);
        }
        catch (BusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    [EnableRateLimiting("ResourceCreationPolicy")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateAdminSchoolDto dto)
    {
        try
        {
            var result = await _schoolService.UpdateAsync(id, dto);
            return Ok(result);
        }
        catch (BusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    [EnableRateLimiting("ResourceCreationPolicy")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _schoolService.DeleteAsync(id);
            return Ok(new { message = "Đã xóa trường thành công." });
        }
        catch (BusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
