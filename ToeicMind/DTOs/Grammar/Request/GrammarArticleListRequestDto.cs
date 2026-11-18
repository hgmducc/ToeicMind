using System.ComponentModel.DataAnnotations;

namespace ToeicMind.DTOs.Grammar.Request;

/// <summary>Admin lọc bài ngữ pháp theo chủ điểm, từ khóa tiêu đề, đã xóa hay chưa; phân trang.</summary>
public class GrammarArticleListRequestDto
{
    [Range(1, 1000000)]
    public int Page { get; set; } = 1;
    [Range(1, 100)]
    public int PageSize { get; set; } = 20;
    [Range(1, int.MaxValue)]
    public int? GrammarTopicId { get; set; }
    [MaxLength(200)]
    public string? Search { get; set; }
    public bool IsDeleted { get; set; }
}
