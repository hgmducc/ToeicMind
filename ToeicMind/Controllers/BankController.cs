using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToeicMind.Services.Learning;

namespace ToeicMind.Controllers;

/// <summary>
/// API ngân hàng câu hỏi (Nghe Part 1–4, Đọc Part 5–7): học theo thẻ Level hoặc chủ điểm của từng Part, qua mọi đề đã xuất bản. Tiến độ ghi theo từng câu.
/// Danh sách thẻ công khai (khách chưa có tiến độ); bắt đầu học và xóa tiến độ cần đăng nhập.
/// </summary>
[Route("api/bank")]
[Authorize]
public class BankController : ApiControllerBase
{
    private readonly ILearnerService _learner;
    public BankController(ILearnerService learner) => _learner = learner;

    /// <summary>
    /// Các thẻ của một Part 1–7 (theo Level và theo chủ điểm) kèm tiến độ: tổng câu, đã luyện, đúng, sai gần nhất, và cây phân loại cho ô lọc.
    /// Câu hỏi là câu chuẩn của đề (không dùng clip cắt). categoryId thu hẹp thẻ Level; levelNo thu hẹp thẻ chủ điểm.
    /// </summary>
    [AllowAnonymous, HttpGet("parts/{partNo:int:range(1,7)}/cards")]
    public async Task<IActionResult> Cards(byte partNo, [FromQuery] BankCardsRequestDto query) =>
        Ok(await _learner.GetBankCardsAsync(UserIdOrNull, partNo, query));

    /// <summary>Bắt đầu lượt học từ một thẻ (CardKey: level-N, cat-N, all, grammar; Pick: NEW câu chưa luyện, WRONG câu sai gần nhất, ALL làm lại cả thẻ). Trả lượt kèm nội dung câu hỏi; dùng PUT /api/attempts/{id}/answers/{questionId} để trả lời.</summary>
    [HttpPost("attempts")]
    public async Task<IActionResult> Start([FromBody] StartBankAttemptRequestDto dto) =>
        Respond(await _learner.StartBankAttemptAsync(UserId, dto), StatusCodes.Status201Created);

    /// <summary>Xóa tiến độ của một thẻ để học lại từ đầu (không xóa lịch sử làm bài).</summary>
    [HttpDelete("parts/{partNo:int:range(1,7)}/cards/{cardKey}/progress")]
    public async Task<IActionResult> Reset(byte partNo, string cardKey)
    {
        var (cleared, error) = await _learner.ResetBankCardAsync(UserId, partNo, cardKey);
        return error is not null ? Fail(error) : Ok(new { cleared });
    }
}
