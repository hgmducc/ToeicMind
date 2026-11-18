namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Tổng quan học tập của người học: bài đã làm, độ chính xác, chuỗi ngày học, điểm, tiến độ theo Part, ngày học, đường điểm, bài gần nhất.</summary>
public class LearnerDashboardDto
{
    public int TotalAttempts { get; set; }
    public int SubmittedAttempts { get; set; }
    public int AnsweredQuestions { get; set; }
    public int CorrectAnswers { get; set; }
    public double AccuracyPercent { get; set; }
    public int CurrentStreak { get; set; }
    public int LongestStreak { get; set; }
    public bool StudiedToday { get; set; }
    public int? BestTotalScaled { get; set; }
    public int? LastTotalScaled { get; set; }
    public int SavedWordCount { get; set; }
    public List<PartProgressDto> Parts { get; set; } = [];
    public List<StudyDayDto> StudyDays { get; set; } = [];
    public List<ScorePointDto> ScoreHistory { get; set; } = [];
    public List<AttemptSummaryDto> RecentAttempts { get; set; } = [];
}
