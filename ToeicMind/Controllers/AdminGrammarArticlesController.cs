using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToeicMind.DTOs.Grammar.Request;
using ToeicMind.Services.Grammar;

namespace ToeicMind.Controllers;

/// <summary>UC-25: Admin quản lý bài ngữ pháp, mỗi chủ điểm Part 5 đúng một bài (thêm, sửa, xóa mềm, khôi phục). Chỉ ADMIN.</summary>
[Route("api/admin/grammar-articles")]
[Authorize(Roles = "ADMIN")]
public class AdminGrammarArticlesController : ApiControllerBase
{
    private readonly IGrammarArticleService _articles;
    public AdminGrammarArticlesController(IGrammarArticleService articles) => _articles = articles;

    /// <summary>15 chủ điểm cố định kèm bài hiện hành (ArticleId null = chưa có bài).</summary>
    [HttpGet("topics")]
    public async Task<IActionResult> Topics() => Ok(await _articles.GetTopicsAsync());

    /// <summary>Danh sách bài (không kèm nội dung), lọc chủ điểm, tiêu đề, đã xóa (thùng rác).</summary>
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] GrammarArticleListRequestDto query) => Ok(await _articles.ListAsync(query));

    [HttpGet("{id:int:min(1)}")]
    public async Task<IActionResult> Get(int id) => Respond(await _articles.GetAsync(id, true));

    [HttpPost]
    public async Task<IActionResult> Create(SaveGrammarArticleRequestDto dto) =>
        Respond(await _articles.SaveAsync(null, dto), StatusCodes.Status201Created);

    [HttpPut("{id:int:min(1)}")]
    public async Task<IActionResult> Update(int id, SaveGrammarArticleRequestDto dto) => Respond(await _articles.SaveAsync(id, dto));

    [HttpDelete("{id:int:min(1)}")]
    public async Task<IActionResult> Delete(int id) => Respond(await _articles.SetDeletedAsync(id, true));

    [HttpPost("{id:int:min(1)}/restore")]
    public async Task<IActionResult> Restore(int id)
    {
        var error = await _articles.SetDeletedAsync(id, false);
        return error is not null ? Fail(error) : Respond(await _articles.GetAsync(id, true));
    }
}
