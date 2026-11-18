using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToeicMind.Services.Grammar;
using ToeicMind.Services.Learning;

namespace ToeicMind.Controllers;

/// <summary>
/// API tab Ngữ pháp của mục Đọc: 15 chủ điểm ngữ pháp của Part 5 theo nhóm (Từ loại, Động từ, Ngữ pháp khác), kèm tiến độ nếu đã đăng nhập,
/// và bài học duy nhất của từng chủ điểm (UC-18). Danh sách chủ điểm công khai; đọc bài cần đăng nhập.
/// </summary>
[Route("api/grammar")]
[Authorize]
public class GrammarController : ApiControllerBase
{
    private readonly ILearnerService _learner;
    private readonly IGrammarArticleService _articles;

    public GrammarController(ILearnerService learner, IGrammarArticleService articles)
    {
        _learner = learner;
        _articles = articles;
    }

    /// <summary>
    /// Các chủ điểm ngữ pháp theo nhóm kèm tiến độ và cờ HasArticle (đã có bài học). parentCategoryId lọc một nhóm (các nút "Từ loại", "Động từ"…).
    /// Học một chủ điểm hoặc cả nhóm (cần đăng nhập): POST /api/bank/attempts với PartNo = 5 và CardKey = cat-{CategoryId}; "Luyện ngẫu nhiên": CardKey = grammar.
    /// </summary>
    [AllowAnonymous, HttpGet("topics")]
    public async Task<IActionResult> Topics([FromQuery, Range(1, int.MaxValue)] int? parentCategoryId) =>
        Ok(await _learner.GetGrammarTopicsAsync(UserIdOrNull, parentCategoryId));

    /// <summary>
    /// Bài học duy nhất của chủ điểm (UC-18): lý thuyết, cấu trúc, ví dụ mẫu, bài tập mẫu, mẹo TOEIC (HTML đã lọc).
    /// Article null = chủ điểm "Đang cập nhật".
    /// </summary>
    [HttpGet("topics/{grammarTopicId:int:min(1)}/article")]
    public async Task<IActionResult> TopicArticle(int grammarTopicId) => Respond(await _articles.GetTopicArticleAsync(grammarTopicId));
}
