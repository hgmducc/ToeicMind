namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Một dòng trong lịch sử làm bài.</summary>
public class AttemptSummaryDto
{
    public int AttemptId { get; set; }
    public int? ExamId { get; set; }
    public string? ExamTitle { get; set; }
    public string Mode { get; set; } = string.Empty;
    public string Scope { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public int? DurationSeconds { get; set; }
    public int TotalQuestions { get; set; }
    public int? CorrectCount { get; set; }
    public int? ListeningScaled { get; set; }
    public int? ReadingScaled { get; set; }
    public int? TotalScaled { get; set; }
}
