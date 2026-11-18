using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToeicMind.Services.Learning;

namespace ToeicMind.Controllers;

/// <summary>
/// API học từ vựng hệ thống: danh sách theo bộ đề → đề → Part, phiên học và ôn tập lặp lại ngắt quãng (SM-2 cải biên), lưu tiến độ trong DB.
/// Tổng quan, danh sách đề và danh sách bài học công khai (khách chưa có tiến độ); danh sách từ, học và ôn tập cần đăng nhập.
/// Bộ từ cá nhân (tự thêm/lưu từ) vẫn ở /api/me/vocabulary.
/// </summary>
[Route("api/vocab")]
[Authorize]
[VocabSchemaFilter]
public class VocabLearningController : ApiControllerBase
{
    private readonly IVocabLearningService _vocab;
    public VocabLearningController(IVocabLearningService vocab) => _vocab = vocab;

    /// <summary>Tổng quan: số từ mới/đang học/đã thuộc, số từ đến hạn ôn, tiến độ hôm nay và các bộ đề có từ vựng.</summary>
    [AllowAnonymous, HttpGet("overview")]
    public async Task<IActionResult> Overview() => Ok(await _vocab.GetOverviewAsync(UserIdOrNull));

    /// <summary>Các đề của một bộ đề gốc kèm số từ, tiến độ và các Part có từ vựng.</summary>
    [AllowAnonymous, HttpGet("sets/{examSetId:int:min(1)}/exams")]
    public async Task<IActionResult> Exams(int examSetId) => Ok(await _vocab.GetExamsAsync(UserIdOrNull, examSetId));

    /// <summary>Danh sách từ vựng, lọc theo bộ đề, đề, Part, CEFR, trạng thái (NEW, LEARNING, MASTERED, DUE), từ khóa; Mine=true chỉ lấy từ trong bộ từ cá nhân.</summary>
    [HttpGet("words")]
    public async Task<IActionResult> Words([FromQuery] VocabWordListRequestDto query) => Ok(await _vocab.GetWordsAsync(UserId, query));

    /// <summary>Các "bài học" nhỏ (mặc định 10 từ/bài) của một phạm vi từ vựng, kèm tiến độ từng bài. Dùng Ids của bài với /study để học đúng bài đó.</summary>
    [AllowAnonymous, HttpGet("lessons")]
    public async Task<IActionResult> Lessons([FromQuery] VocabLessonListRequestDto query) => Ok(await _vocab.GetLessonsAsync(UserIdOrNull, query));

    /// <summary>Tạo phiên học: MIXED (đến hạn rồi mới), REVIEW, NEW hoặc PRACTICE (luyện tự do); hoặc Ids để học một bài. Kèm ngữ cảnh ví dụ, thời gian ôn kế tiếp và Pool đáp án gây nhiễu cho trắc nghiệm/trò chơi.</summary>
    [HttpGet("study")]
    public async Task<IActionResult> Study([FromQuery] VocabStudyRequestDto query) => Ok(await _vocab.GetStudySessionAsync(UserId, query));

    /// <summary>Ghi kết quả một lượt ôn (0 Quên, 1 Khó, 2 Nhớ, 3 Dễ); server tính lịch ôn kế tiếp và lưu tiến độ.</summary>
    [HttpPost("{vocabId:int:min(1)}/review")]
    public async Task<IActionResult> Review(int vocabId, [FromBody] ReviewVocabRequestDto dto) =>
        Respond(await _vocab.ReviewAsync(UserId, vocabId, dto));

    /// <summary>Xóa tiến độ của một từ để học lại từ đầu.</summary>
    [HttpDelete("{vocabId:int:min(1)}/progress")]
    public async Task<IActionResult> Reset(int vocabId) => Respond(await _vocab.ResetAsync(UserId, vocabId));
}
