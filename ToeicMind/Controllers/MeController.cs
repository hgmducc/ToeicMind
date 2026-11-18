using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToeicMind.Services.Learning;

namespace ToeicMind.Controllers;

/// <summary>API học tập của người dùng đang đăng nhập: tổng quan (tiến độ, ngày học, điểm) và bộ từ cá nhân.</summary>
[Route("api/me")]
[Authorize]
public class MeController : ApiControllerBase
{
    private readonly ILearnerService _learner;
    private readonly IUserVocabularyService _vocabulary;
    private readonly IPersonalizationService _personalization;

    public MeController(ILearnerService learner, IUserVocabularyService vocabulary, IPersonalizationService personalization)
    {
        _learner = learner;
        _vocabulary = vocabulary;
        _personalization = personalization;
    }

    /// <summary>Mục tiêu học (điểm mục tiêu, ngày thi, số phút mỗi ngày). IsSet = false khi chưa đặt.</summary>
    [HttpGet("profile"), PersonalizationSchemaFilter]
    public async Task<IActionResult> Profile() => Ok(await _personalization.GetProfileAsync(UserId));

    /// <summary>Lưu mục tiêu học (gửi đủ các trường; null = bỏ trống).</summary>
    [HttpPut("profile"), PersonalizationSchemaFilter]
    public async Task<IActionResult> SaveProfile([FromBody] SaveLearnerProfileRequestDto dto) => Ok(await _personalization.SaveProfileAsync(UserId, dto));

    /// <summary>
    /// Lộ trình cá nhân: mục tiêu, trạng thái kiểm tra đầu vào, điểm ước tính từng kỹ năng, phân tích Part/chủ điểm mạnh yếu
    /// và các bài học gợi ý (thẻ ngân hàng, ôn từ vựng, nghe chép, thi thử) kèm kế hoạch hôm nay theo số phút học mỗi ngày.
    /// </summary>
    [HttpGet("learning-plan"), PersonalizationSchemaFilter]
    public async Task<IActionResult> LearningPlan() => Ok(await _personalization.GetPlanAsync(UserId));

    /// <summary>
    /// Tổng quan học tập trong một phản hồi: số bài, độ chính xác, chuỗi ngày học, điểm tốt nhất/gần nhất, tiến độ theo 7 Part,
    /// ngày học của <c>days</c> ngày gần nhất (mặc định 30, tối đa 365), đường điểm của <c>scoreLimit</c> bài Luyện thi có điểm gần nhất (mặc định 20, tối đa 50), 5 bài gần nhất.
    /// </summary>
    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard([FromQuery] LearnerDashboardRequestDto query) =>
        Ok(await _learner.GetDashboardAsync(UserId, query));

    /// <summary>Bộ từ cá nhân (tìm theo từ hoặc nghĩa).</summary>
    [HttpGet("vocabulary")]
    public async Task<IActionResult> Vocabulary([FromQuery] UserVocabularyListRequestDto query) =>
        Ok(await _vocabulary.ListAsync(UserId, query));

    /// <summary>Lưu một từ vào bộ từ cá nhân: từ hệ thống (VocabId) hoặc từ tự thêm (CustomWord + CustomMeaning).</summary>
    [HttpPost("vocabulary")]
    public async Task<IActionResult> SaveVocabulary([FromBody] SaveUserVocabularyRequestDto dto) =>
        Respond(await _vocabulary.SaveAsync(UserId, dto), StatusCodes.Status201Created);

    [HttpDelete("vocabulary/{id:int:min(1)}")]
    public async Task<IActionResult> DeleteVocabulary(int id) => Respond(await _vocabulary.DeleteAsync(UserId, id));
}
