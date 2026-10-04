using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.API.Common;
using SkillBridge.Application.DTOs.Users;
using SkillBridge.Application.Interfaces.Users;

namespace SkillBridge.API.Controllers.users;

[ApiController]
[Route("api/users")]
[Authorize]
public class UserController : ControllerBase
{
    private readonly IUserService _userService;

    public UserController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet("profile")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetProfile()
    {
        var userId = User.GetRequiredUserId();
        var profile = await _userService.GetProfileAsync(userId);
        return Ok(profile);
    }

    [HttpPut("profile")]
    [EnableRateLimiting("ResourceCreationPolicy")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateUserProfileRequest request)
    {
        var userId = User.GetRequiredUserId();
        var profile = await _userService.UpdateProfileAsync(userId, request);
        return Ok(profile);
    }

    [HttpPost("avatar")]
    [Consumes("multipart/form-data")]
    [EnableRateLimiting("UploadPolicy")]
    public async Task<IActionResult> UploadAvatar(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "Vui lòng chọn file hình ảnh avatar để tải lên." });
        }

        var userId = User.GetRequiredUserId();
        using var stream = file.OpenReadStream();
        var result = await _userService.UploadAvatarAsync(
            userId,
            stream,
            file.FileName,
            file.ContentType);

        return Ok(new
        {
            message = "Cập nhật ảnh đại diện thành công.",
            avatarUrl = result.FileUrl,
            fileKey = result.FileKey
        });
    }

    [HttpPost("cover")]
    [Consumes("multipart/form-data")]
    [EnableRateLimiting("UploadPolicy")]
    public async Task<IActionResult> UploadCover(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "Vui lòng chọn file hình ảnh bìa để tải lên." });
        }

        var userId = User.GetRequiredUserId();
        using var stream = file.OpenReadStream();
        var result = await _userService.UploadCoverAsync(
            userId,
            stream,
            file.FileName,
            file.ContentType);

        return Ok(new
        {
            message = "Cập nhật ảnh bìa thành công.",
            coverImageUrl = result.FileUrl,
            fileKey = result.FileKey
        });
    }

    [HttpGet("{id:int}/public-profile")]
    [HttpGet("{id:int}/student-profile")]
    [AllowAnonymous]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetPublicProfile(int id)
    {
        var profile = await _userService.GetPublicStudentProfileAsync(id);
        return Ok(profile);
    }

    [HttpGet("{id:int}/company-profile")]
    [AllowAnonymous]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetCompanyProfile(int id)
    {
        var profile = await _userService.GetPublicCompanyProfileAsync(id);
        return Ok(profile);
    }

    [HttpGet("portfolio")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetPortfolio()
    {
        var userId = User.GetRequiredUserId();
        var result = await _userService.GetPortfolioAsync(userId);
        return Ok(result);
    }

    [HttpPost("portfolio")]
    [Consumes("multipart/form-data")]
    [EnableRateLimiting("UploadPolicy")]
    public async Task<IActionResult> UploadPortfolio(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "Vui lòng chọn file tác phẩm để tải lên." });
        }

        var userId = User.GetRequiredUserId();
        using var stream = file.OpenReadStream();
        var result = await _userService.UploadPortfolioAsync(
            userId,
            stream,
            file.FileName,
            file.ContentType);

        return Ok(result);
    }

    [HttpDelete("portfolio/{id:int}")]
    [EnableRateLimiting("ResourceCreationPolicy")]
    public async Task<IActionResult> DeletePortfolio(int id)
    {
        var userId = User.GetRequiredUserId();
        await _userService.DeletePortfolioAsync(userId, id);
        return Ok(new { message = "Xóa tác phẩm thành công." });
    }

    [HttpGet("badges")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetUserBadges()
    {
        var userId = User.GetRequiredUserId();
        var result = await _userService.GetUserBadgesAsync(userId);
        return Ok(result);
    }
}
