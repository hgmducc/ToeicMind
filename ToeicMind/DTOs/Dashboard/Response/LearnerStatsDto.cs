using ToeicMind.DTOs.Learning.Response;

namespace ToeicMind.DTOs.Dashboard.Response;

/// <summary>Thống kê học tập của một học viên (cho Admin).</summary>
public class LearnerStatsDto
{
    public int UserId { get; set; }
    public int TotalAttempts { get; set; }
    public int SubmittedAttempts { get; set; }
    public int AbandonedAttempts { get; set; }
    public int AnsweredQuestions { get; set; }
    public double AccuracyPercent { get; set; }
    public int? BestTotalScaled { get; set; }
    public DateOnly? LastStudyDate { get; set; }
    public int CurrentStreak { get; set; }
    public int SavedWordCount { get; set; }
    public int ReportCount { get; set; }
    public List<PartProgressDto> Parts { get; set; } = [];
}
