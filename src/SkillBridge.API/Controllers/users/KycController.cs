using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.API.Common;
using SkillBridge.Application.Common;
using SkillBridge.Application.DTOs.Users;
using SkillBridge.Application.Interfaces.Users;

namespace SkillBridge.API.Controllers.users;

[ApiController]
[Route("api/users/kyc")]
[Authorize]
public class KycController : ControllerBase
{
    private readonly IKycService _kycService;

    public KycController(IKycService kycService)
    {
        _kycService = kycService;
    }

    /// <summary>
    /// Lấy trạng thái xác minh danh tính eKYC của người dùng hiện tại
    /// </summary>
    [HttpGet("status")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetKycStatus(CancellationToken ct)
    {
        var userId = User.GetRequiredUserId();
        try
        {
            var result = await _kycService.GetKycStatusAsync(userId, ct);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Gửi hồ sơ xác minh danh tính (Thẻ sinh viên / Giấy phép kinh doanh)
    /// </summary>
    [HttpPost("submit")]
    [Consumes("multipart/form-data")]
    [EnableRateLimiting("UploadPolicy")]
    public async Task<IActionResult> SubmitKyc(
        [FromForm] SubmitKycRequest request,
        List<IFormFile> files,
        CancellationToken ct)
    {
        var userId = User.GetRequiredUserId();

        if (files == null || files.Count == 0)
        {
            return BadRequest(new { message = "Vui lòng chọn ít nhất một hình ảnh thẻ sinh viên hoặc giấy tờ hợp lệ." });
        }

        var uploadModels = new List<KycFileUploadModel>();
        try
        {
            foreach (var file in files)
            {
                uploadModels.Add(new KycFileUploadModel
                {
                    FileStream = file.OpenReadStream(),
                    FileName = file.FileName,
                    ContentType = file.ContentType,
                    Length = file.Length,
                    DocType = request.DocumentType
                });
            }

            var result = await _kycService.SubmitKycAsync(userId, request, uploadModels, ct);
            return Ok(result);
        }
        catch (BusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        finally
        {
            foreach (var m in uploadModels)
            {
                try { m.FileStream?.Dispose(); } catch { }
            }
        }
    }
}
