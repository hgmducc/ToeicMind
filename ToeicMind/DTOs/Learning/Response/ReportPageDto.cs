namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Trang báo cáo lỗi.</summary>
public class ReportPageDto
{
    public List<ReportDto> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
