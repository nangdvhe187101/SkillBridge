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
    public async Task<IActionResult> UploadAvatar([FromForm] IFormFile file)
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
}
