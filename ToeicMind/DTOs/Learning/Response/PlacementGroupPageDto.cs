namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Trang nhóm câu hỏi ứng viên cho bài kiểm tra đầu vào.</summary>
public class PlacementGroupPageDto
{
    public List<PlacementGroupDto> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
