namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Bài kiểm tra đầu vào trong danh sách Admin: cấu trúc theo Part, trạng thái dùng, số lượt đã làm. Groups chỉ có ở API chi tiết.</summary>
public class PlacementTestSummaryDto
{
    public int PlacementTestId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int TimeLimitSeconds { get; set; }
    public bool IsActive { get; set; }
    public int GroupCount { get; set; }
    public int TotalQuestions { get; set; }
    public List<PlacementPartDto> Parts { get; set; } = [];
    public int AttemptCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<PlacementGroupDto>? Groups { get; set; }
}
