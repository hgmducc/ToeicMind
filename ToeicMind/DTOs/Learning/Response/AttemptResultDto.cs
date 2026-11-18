namespace ToeicMind.DTOs.Learning.Response;

/// <summary>
/// Kết quả một lần làm bài: số câu đúng, điểm quy đổi (nếu đủ điều kiện, BR-07) và thống kê theo Part.
/// Questions (đúng/sai, nhãn đáp án chọn và đáp án đúng) có ở mọi lượt đã nộp. Groups (xem lại chi tiết từng câu kèm giải thích)
/// chỉ có khi gọi với includeReview=true. Luyện thi được xem cả hai sau khi nộp trừ khi đặt Learning:AllowExamReview = false (BR-09 sửa 17/11/2026).
/// </summary>
public class AttemptResultDto
{
    public int AttemptId { get; set; }
    public int? ExamId { get; set; }
    public string? ExamTitle { get; set; }
    public string Mode { get; set; } = string.Empty;
    public string Scope { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public bool IsAutoSubmitted { get; set; }
    public int? DurationSeconds { get; set; }
    public int TotalQuestions { get; set; }
    public int AnsweredCount { get; set; }
    public int? CorrectCount { get; set; }
    public int? ListeningScaled { get; set; }
    public int? ReadingScaled { get; set; }
    public int? TotalScaled { get; set; }
    /// <summary>Chỉ có ở bài kiểm tra đầu vào (Scope = PLACEMENT): Level ước tính của từng kỹ năng theo LevelBand. Điểm *Scaled khi đó là điểm ước tính.</summary>
    public LevelInfoDto? ListeningLevel { get; set; }
    public LevelInfoDto? ReadingLevel { get; set; }
    public List<PartResultDto> Parts { get; set; } = [];
    public List<QuestionResultDto>? Questions { get; set; } = [];
    public List<ReviewGroupDto>? Groups { get; set; }
}
