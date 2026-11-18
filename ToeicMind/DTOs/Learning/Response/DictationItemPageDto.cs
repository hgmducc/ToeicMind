namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Trang danh sách bộ clip Nghe chép.</summary>
public class DictationItemPageDto
{
    public List<DictationItemDto> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
