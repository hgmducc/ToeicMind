namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Một trang danh sách từ vựng.</summary>
public class VocabWordPageDto
{
    public List<VocabWordDto> Items { get; set; } = [];
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
