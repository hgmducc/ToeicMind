namespace ToeicMind.DTOs.Grammar.Response;

/// <summary>Trang danh sách bài ngữ pháp (Admin).</summary>
public class GrammarArticlePageDto
{
    public List<GrammarArticleDto> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
