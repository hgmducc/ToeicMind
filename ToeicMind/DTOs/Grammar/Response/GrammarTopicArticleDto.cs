namespace ToeicMind.DTOs.Grammar.Response;

/// <summary>Người học mở một chủ điểm: thông tin chủ điểm và bài học duy nhất (kèm nội dung). Article null = "Đang cập nhật" (UC-18 E1).</summary>
public class GrammarTopicArticleDto
{
    public GrammarArticleTopicDto Topic { get; set; } = new();
    public GrammarArticleDto? Article { get; set; }
}
