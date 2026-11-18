using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToeicMind.Services.Learning;

namespace ToeicMind.Controllers;

/// <summary>
/// Kiểm tra đầu vào của người học (CHG-007). Làm bài, lưu đáp án, nộp và xem kết quả dùng chung API /api/attempts (Scope = PLACEMENT).
/// </summary>
[Route("api/placement")]
[Authorize]
[PersonalizationSchemaFilter]
public class PlacementController : ApiControllerBase
{
    private readonly IPlacementService _placement;
    public PlacementController(IPlacementService placement) => _placement = placement;

    /// <summary>Bài kiểm tra đang dùng (số câu theo Part, thời gian), lượt đang làm dở và kết quả gần nhất (điểm ước tính, Level từng kỹ năng).</summary>
    [HttpGet]
    public async Task<IActionResult> Status() => Ok(await _placement.GetStatusAsync(UserId));

    /// <summary>Bắt đầu bài kiểm tra (Luyện thi có giờ, nội dung gửi kèm). Đang có lượt làm dở thì trả lại lượt đó để làm tiếp.</summary>
    [HttpPost("attempts")]
    public async Task<IActionResult> Start() => Respond(await _placement.StartAsync(UserId), StatusCodes.Status201Created);
}
