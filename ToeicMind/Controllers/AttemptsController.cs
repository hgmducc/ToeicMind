using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToeicMind.Services.Learning;

namespace ToeicMind.Controllers;

/// <summary>API làm bài của người học (cần đăng nhập): tạo lượt, lưu đáp án, nộp, kết quả kèm xem lại, lịch sử. Chỉ thao tác trên lượt của chính mình.</summary>
[Route("api/attempts")]
[Authorize]
public class AttemptsController : ApiControllerBase
{
    private readonly IAttemptService _attempts;
    public AttemptsController(IAttemptService attempts) => _attempts = attempts;

    /// <summary>Bắt đầu làm bài trong một đề: Mode EXAM (đồng hồ, chấm khi nộp) hoặc PRACTICE (chấm và giải thích ngay); Scope FULL/LISTENING/READING/PART.</summary>
    [HttpPost]
    public async Task<IActionResult> Start([FromBody] StartAttemptRequestDto dto) =>
        Respond(await _attempts.StartAsync(UserId, dto), StatusCodes.Status201Created);

    /// <summary>Lịch sử làm bài của tôi (mới nhất trước), lọc theo Mode, Scope, Status.</summary>
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] AttemptListRequestDto query) =>
        Ok(await _attempts.ListAsync(UserId, query));

    /// <summary>Trạng thái lượt làm: các câu đã chọn, thời gian còn lại (theo đồng hồ máy chủ). Dùng để làm tiếp khi tải lại trang. Hết giờ sẽ được tự nộp.</summary>
    [HttpGet("{id:int:min(1)}")]
    public async Task<IActionResult> Get(int id) => Respond(await _attempts.GetAsync(UserId, id));

    /// <summary>Lưu đáp án một câu (gọi ngay khi chọn). OptionId = null bỏ chọn (Luyện thi, hoặc Luyện tập chưa hiện đáp án).
    /// Luyện tập: Reveal = true (mặc định) trả kèm đáp án đúng và giải thích rồi khóa câu; Reveal = false chỉ lưu lựa chọn.</summary>
    [HttpPut("{id:int:min(1)}/answers/{questionId:int:min(1)}")]
    public async Task<IActionResult> SaveAnswer(int id, int questionId, [FromBody] SaveAnswerRequestDto dto) =>
        Respond(await _attempts.SaveAnswerAsync(UserId, id, questionId, dto.OptionId, dto.Reveal));

    /// <summary>Cộng số giây vừa xem hướng dẫn; thời gian này không bị tính vào đồng hồ thi.</summary>
    [HttpPost("{id:int:min(1)}/direction-time")]
    public async Task<IActionResult> DirectionTime(int id, [FromBody] DirectionTimeRequestDto dto) =>
        Respond(await _attempts.AddDirectionTimeAsync(UserId, id, dto.Seconds));

    /// <summary>Nộp bài và nhận kết quả. Nộp lại lượt đã nộp trả lại kết quả cũ.</summary>
    [HttpPost("{id:int:min(1)}/submit")]
    public async Task<IActionResult> Submit(int id) => Respond(await _attempts.SubmitAsync(UserId, id));

    /// <summary>Bỏ dở lượt đang làm (không chấm, không tính ngày học).</summary>
    [HttpPost("{id:int:min(1)}/abandon")]
    public async Task<IActionResult> Abandon(int id) => Respond(await _attempts.AbandonAsync(UserId, id));

    /// <summary>
    /// Kết quả lượt đã nộp: số câu đúng, điểm quy đổi, thống kê theo Part.
    /// includeReview=true kèm xem lại từng câu (đáp án chọn, đáp án đúng, giải thích, transcript, từ vựng); không dành cho Luyện thi.
    /// </summary>
    [HttpGet("{id:int:min(1)}/result")]
    public async Task<IActionResult> Result(int id, [FromQuery] bool includeReview = false) =>
        Respond(await _attempts.GetResultAsync(UserId, id, includeReview));

    /// <summary>Xóa lượt đã nộp/bỏ dở khỏi lịch sử (xóa mềm). Lượt đang làm phải nộp hoặc bỏ dở trước.</summary>
    [HttpDelete("{id:int:min(1)}")]
    public async Task<IActionResult> Delete(int id) => Respond(await _attempts.DeleteAsync(UserId, id));
}
