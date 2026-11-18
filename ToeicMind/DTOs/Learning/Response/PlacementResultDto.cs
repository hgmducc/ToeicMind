namespace ToeicMind.DTOs.Learning.Response;

/// <summary>
/// Kết quả bài kiểm tra đầu vào đã nộp: số câu đúng và điểm TOEIC ước tính theo từng kỹ năng
/// (tỷ lệ đúng của kỹ năng quy về 100 câu rồi tra bảng ScoreConversion), kèm Level tương ứng trong LevelBand.
/// </summary>
public class PlacementResultDto
{
    public int AttemptId { get; set; }
    public int? PlacementTestId { get; set; }
    public string? Title { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public int TotalQuestions { get; set; }
    public int? CorrectCount { get; set; }
    public int? ListeningScaled { get; set; }
    public int? ReadingScaled { get; set; }
    public int? TotalScaled { get; set; }
    public LevelInfoDto? ListeningLevel { get; set; }
    public LevelInfoDto? ReadingLevel { get; set; }
}
