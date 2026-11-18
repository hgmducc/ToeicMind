namespace ToeicMind.DTOs.Grammar.Response;

/// <summary>Một chủ điểm ngữ pháp kèm bài (chưa xóa) của nó; ArticleId null = chủ điểm chưa có bài ("Đang cập nhật").</summary>
public class GrammarArticleTopicDto
{
    public int GrammarTopicId { get; set; }
    public int CategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? GroupName { get; set; }
    public string? Summary { get; set; }
    public int? ArticleId { get; set; }
    public string? ArticleTitle { get; set; }
    public DateTime? ArticleUpdatedAt { get; set; }
}
