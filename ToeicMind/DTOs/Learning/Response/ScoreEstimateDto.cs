namespace ToeicMind.DTOs.Learning.Response;

/// <summary>
/// Điểm TOEIC hiện tại ước tính theo từng kỹ năng. Mỗi kỹ năng lấy lần đo gần nhất có điểm (bài kiểm tra đầu vào hoặc bài làm đủ 100 câu của kỹ năng);
/// nếu chưa có thì ước tính từ tỷ lệ đúng khi luyện (cần tối thiểu số câu đã trả lời). Source: PLACEMENT, EXAM, PRACTICE hoặc null (chưa đủ dữ liệu).
/// </summary>
public class ScoreEstimateDto
{
    public int? ListeningScaled { get; set; }
    public string? ListeningSource { get; set; }
    public int? ReadingScaled { get; set; }
    public string? ReadingSource { get; set; }
    /// <summary>Chỉ có khi cả hai kỹ năng đều có điểm.</summary>
    public int? TotalScaled { get; set; }
    public DateTime? MeasuredAt { get; set; }
}
