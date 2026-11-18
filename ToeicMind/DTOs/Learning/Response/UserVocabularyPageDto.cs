namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Trang bộ từ cá nhân.</summary>
public class UserVocabularyPageDto
{
    public List<UserVocabularyDto> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
