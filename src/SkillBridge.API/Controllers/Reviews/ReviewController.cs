using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkillBridge.API.Common;
using SkillBridge.Application.DTOs.Reviews;
using SkillBridge.Application.Interfaces.Reviews;

namespace SkillBridge.API.Controllers.Reviews;

[ApiController]
[Route("api/reviews")]
public class ReviewController : ControllerBase
{
    private readonly IReviewService _reviewService;

    public ReviewController(IReviewService reviewService)
    {
        _reviewService = reviewService;
    }

    /// <summary>
    /// Gửi đánh giá cho công việc đã hoàn thành
    /// </summary>
    [Authorize]
    [HttpPost]
    [EnableRateLimiting("ResourceCreationPolicy")]
    public async Task<IActionResult> CreateReview([FromBody] CreateReviewRequest request, CancellationToken cancellationToken)
    {
        var currentUserId = User.GetRequiredUserId();
        var result = await _reviewService.CreateReviewAsync(currentUserId, request, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách đánh giá của một công việc cụ thể
    /// </summary>
    [HttpGet("job/{jobId:int}")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetJobReviews(int jobId, CancellationToken cancellationToken)
    {
        var currentUserId = User.GetCurrentUserId();
        var result = await _reviewService.GetJobReviewsAsync(jobId, currentUserId, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách đánh giá nhận được của một người dùng
    /// </summary>
    [HttpGet("user/{userId:int}")]
    [EnableRateLimiting("GeneralApiPolicy")]
    public async Task<IActionResult> GetUserReviews(int userId, CancellationToken cancellationToken)
    {
        var result = await _reviewService.GetUserReviewsAsync(userId, cancellationToken);
        return Ok(result);
    }
}
