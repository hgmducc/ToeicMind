namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Bài kiểm tra đầu vào đang dùng, phần người học được xem trước khi làm (không có nội dung câu hỏi).</summary>
public class PlacementTestInfoDto
{
    public int PlacementTestId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int TimeLimitSeconds { get; set; }
    public int TotalQuestions { get; set; }
    public List<PlacementPartDto> Parts { get; set; } = [];
}
