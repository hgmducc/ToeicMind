namespace ToeicMind.DTOs.Dashboard.Response;

/// <summary>Thống kê một đề: số lượt làm và kết quả trung bình.</summary>
public class ExamStatDto
{
    public int ExamId { get; set; }
    public string ExamCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public int Attempts { get; set; }
    public int SubmittedAttempts { get; set; }
    public double? AverageCorrectPercent { get; set; }
    public double? AverageTotalScaled { get; set; }
}
