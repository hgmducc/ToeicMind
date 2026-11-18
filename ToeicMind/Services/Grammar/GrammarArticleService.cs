using Ganss.Xss;
using ToeicMind.DTOs.Grammar.Request;
using ToeicMind.DTOs.Grammar.Response;
using ToeicMind.Models.Catalogs;
using ToeicMind.Repositories.Grammar;

namespace ToeicMind.Services.Grammar;

/// <summary>
/// Nghiệp vụ bài ngữ pháp. Mỗi chủ điểm (15 chủ điểm Part 5 cố định) có đúng một bài học tương tác: mỗi phần (&lt;h2&gt;) đi theo nhịp
/// lý thuyết → cấu trúc → ví dụ → bài tập "Thử ngay", cuối bài có mẹo làm bài TOEIC. Bài có hiệu lực ngay khi lưu (UC-25); xóa mềm, khôi phục được.
/// Nội dung được lọc HTML (chặn script/thuộc tính nguy hiểm), chỉ giữ các class khung bài để giao diện người học định dạng và dựng bài tập tương tác.
/// Người học mở chủ điểm để học (UC-18).
/// </summary>
public class GrammarArticleService : IGrammarArticleService
{
    // Class khung bài do trình soạn Admin chèn; class khác bị bỏ khi lọc. Bài tập tương tác:
    // div.grammar-exercise > (câu hỏi) + ol.grammar-options > li (li.grammar-correct = đáp án đúng) + div.grammar-explain (giải thích).
    private static readonly string[] SectionClasses =
        ["grammar-structure", "grammar-example", "grammar-exercise", "grammar-tip", "grammar-options", "grammar-correct", "grammar-explain"];

    private readonly IGrammarArticleRepository _repo;
    private readonly HtmlSanitizer _html = new();

    public GrammarArticleService(IGrammarArticleRepository repo)
    {
        _repo = repo;
        _html.AllowedAttributes.Add("class");
        foreach (var name in SectionClasses) _html.AllowedClasses.Add(name);
    }

    public Task<List<GrammarArticleTopicDto>> GetTopicsAsync() => _repo.GetTopicsAsync();

    public async Task<GrammarArticlePageDto> ListAsync(GrammarArticleListRequestDto query)
    {
        var (items, total) = await _repo.ListAsync(query);
        return new GrammarArticlePageDto { Items = items, TotalCount = total, Page = query.Page, PageSize = query.PageSize };
    }

    public async Task<(GrammarArticleDto? Result, string? Error)> GetAsync(int articleId, bool includeDeleted)
    {
        var article = await _repo.GetAsync(articleId, includeDeleted);
        return article is null ? (null, "GRAMMAR_ARTICLE_NOT_FOUND") : (article, null);
    }

    public async Task<(GrammarArticleDto? Result, string? Error)> SaveAsync(int? articleId, SaveGrammarArticleRequestDto dto)
    {
        var title = dto.Title.Trim();
        var content = _html.Sanitize(dto.Content).Trim();
        // E1: tiêu đề hoặc nội dung rỗng (kể cả nội dung chỉ còn rỗng sau khi lọc HTML).
        if (title.Length == 0 || content.Length == 0) return (null, "GRAMMAR_ARTICLE_EMPTY");
        // E2: chủ điểm phải thuộc danh sách 15 chủ điểm cố định.
        var topicId = dto.GrammarTopicId!.Value;
        if (await _repo.GetTopicAsync(topicId) is null) return (null, "GRAMMAR_TOPIC_INVALID");
        var existing = articleId is null ? null : await _repo.GetAsync(articleId.Value, true);
        if (articleId is not null && existing is null) return (null, "GRAMMAR_ARTICLE_NOT_FOUND");
        // Mỗi chủ điểm một bài: chủ điểm đã có bài (khác bài đang sửa) thì phải sửa bài đó. Bài trong thùng rác vẫn sửa được.
        if (existing is not { IsDeleted: true } && await _repo.TopicHasOtherArticleAsync(topicId, articleId)) return (null, "GRAMMAR_ARTICLE_EXISTS");

        int id;
        if (articleId is null)
        {
            var now = DateTime.UtcNow;
            var (created, error) = await _repo.AddAsync(new GrammarArticle { GrammarTopicId = topicId, Title = title, Content = content, CreatedAt = now, UpdatedAt = now });
            if (error is not null) return (null, error);
            id = created!.Value;
        }
        else
        {
            id = articleId.Value;
            var error = await _repo.UpdateAsync(id, topicId, title, content);
            if (error is not null) return (null, error);
        }
        return (await _repo.GetAsync(id, true), null);
    }

    public async Task<string?> SetDeletedAsync(int articleId, bool deleted)
    {
        var article = await _repo.GetAsync(articleId, true);
        if (article is null) return "GRAMMAR_ARTICLE_NOT_FOUND";
        // Khôi phục khi chủ điểm đã có bài mới: giữ một bài duy nhất.
        if (!deleted && await _repo.TopicHasOtherArticleAsync(article.GrammarTopicId, articleId)) return "GRAMMAR_ARTICLE_EXISTS";
        return await _repo.SetDeletedAsync(articleId, deleted);
    }

    public async Task<(GrammarTopicArticleDto? Result, string? Error)> GetTopicArticleAsync(int grammarTopicId)
    {
        var topic = await _repo.GetTopicAsync(grammarTopicId);
        if (topic is null) return (null, "GRAMMAR_TOPIC_NOT_FOUND");
        return (new GrammarTopicArticleDto { Topic = topic, Article = await _repo.GetByTopicAsync(grammarTopicId) }, null);
    }
}
