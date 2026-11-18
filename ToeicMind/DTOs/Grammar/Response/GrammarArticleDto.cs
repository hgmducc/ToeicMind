namespace ToeicMind.DTOs.Grammar.Response;

/// <summary>Bài ngữ pháp duy nhất của một chủ điểm. Content chỉ có khi xem chi tiết; danh sách để null.</summary>
public class GrammarArticleDto
{
    public int ArticleId { get; set; }
    public int GrammarTopicId { get; set; }
    public int CategoryId { get; set; }
    public string TopicName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Content { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
