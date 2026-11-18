namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Trang lịch sử làm bài.</summary>
public class AttemptPageDto
{
    public List<AttemptSummaryDto> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
