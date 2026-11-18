namespace ToeicMind.DTOs.Listening.Response;

/// <summary>Trang danh sách bộ clip sưu tầm (Admin).</summary>
public class ListeningItemPageDto
{
    public List<ListeningItemSummaryDto> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
