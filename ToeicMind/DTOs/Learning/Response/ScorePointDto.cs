namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Một điểm trên đường điểm của người học (các bài Luyện thi có điểm, gồm điểm ước tính của bài kiểm tra đầu vào: Scope = PLACEMENT).</summary>
public class ScorePointDto
{
    public int AttemptId { get; set; }
    public string? ExamTitle { get; set; }
    public string Scope { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
    public int? ListeningScaled { get; set; }
    public int? ReadingScaled { get; set; }
    public int? TotalScaled { get; set; }
}
