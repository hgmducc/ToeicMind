using System.ComponentModel.DataAnnotations;

namespace ToeicMind.DTOs.Learning.Request;

/// <summary>Phân trang và tìm kiếm bộ từ cá nhân.</summary>
public class UserVocabularyListRequestDto
{
    [Range(1, 1000000)]
    public int Page { get; set; } = 1;
    [Range(1, 100)]
    public int PageSize { get; set; } = 20;
    [MaxLength(100)]
    public string? Search { get; set; }
}
