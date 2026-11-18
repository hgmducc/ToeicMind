using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToeicMind.Services.Learning;

namespace ToeicMind.Controllers;

/// <summary>
/// API Nghe chép: luyện nghe chép chính tả bằng các clip cắt từ nhóm câu Nghe của đề gốc (Part 1–4).
/// Chia theo bộ đề gốc → đề → Part, hoặc lọc theo loại bài, Level, dạng đặc biệt, "câu cần luyện".
/// Các danh sách công khai (khách chưa có tiến độ); nội dung clip (script, audio) và lưu tiến độ cần đăng nhập.
/// </summary>
[Route("api/dictation")]
[Authorize]
public class DictationController : ApiControllerBase
{
    private readonly IDictationService _dictation;
    public DictationController(IDictationService dictation) => _dictation = dictation;

    /// <summary>Các bộ đề gốc (tab) có clip để nghe chép, kèm số bộ clip, số clip và số bộ clip "câu cần luyện" của tôi.</summary>
    [AllowAnonymous, HttpGet("sets")]
    public async Task<IActionResult> Sets() => Ok(await _dictation.GetOverviewAsync(UserIdOrNull));

    /// <summary>Các đề (Test) của một bộ đề gốc, mỗi đề có thẻ Part 1–4 với số clip và trạng thái luyện.</summary>
    [AllowAnonymous, HttpGet("sets/{examSetId:int:min(1)}/exams")]
    public async Task<IActionResult> Exams(int examSetId) => Ok(await _dictation.GetExamsAsync(UserIdOrNull, examSetId));

    /// <summary>Bộ lọc "Theo chủ đề": loại bài (cây phân loại), Level và dạng đặc biệt, kèm số bộ clip/clip. PartNo (1–4) để thu hẹp.</summary>
    [AllowAnonymous, HttpGet("topics")]
    public async Task<IActionResult> Topics([FromQuery] DictationTopicsRequestDto query) => Ok(await _dictation.GetTopicsAsync(UserIdOrNull, query));

    /// <summary>Danh sách bộ clip, lọc theo bộ đề, đề, Part, loại bài (gồm loại con), Level, dạng đặc biệt, trạng thái (NEEDS_PRACTICE = câu cần luyện).</summary>
    [AllowAnonymous, HttpGet("items")]
    public async Task<IActionResult> Items([FromQuery] DictationItemListRequestDto query) => Ok(await _dictation.GetItemsAsync(UserIdOrNull, query));

    /// <summary>Các clip của một bộ clip theo thứ tự: script, bản dịch, link audio đã ký (còn hạn vài phút). Client tự ẩn từ và chấm độ chính xác.</summary>
    [HttpGet("items/{itemId:int:min(1)}")]
    public async Task<IActionResult> Item(int itemId) => Respond(await _dictation.GetItemAsync(UserId, itemId));

    /// <summary>Ghi nhận đã luyện xong một bộ clip (chế độ và độ chính xác 0–100). Cập nhật tiến độ, "câu cần luyện" và ngày học.</summary>
    [HttpPost("items/{itemId:int:min(1)}/progress")]
    public async Task<IActionResult> SaveProgress(int itemId, [FromBody] SaveDictationProgressRequestDto dto) =>
        Respond(await _dictation.SaveProgressAsync(UserId, itemId, dto));
}
