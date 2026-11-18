namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Một lần làm bài đang diễn ra hoặc vừa tạo. RemainingSeconds tính theo đồng hồ máy chủ (chỉ Luyện thi).</summary>
public class AttemptDto
{
    public int AttemptId { get; set; }
    public int? ExamId { get; set; }
    public string Mode { get; set; } = string.Empty;
    public string Scope { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int? TimeLimitSeconds { get; set; }
    public int? RemainingSeconds { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public int DirectionSeconds { get; set; }
    public int TotalQuestions { get; set; }
    public int AnsweredCount { get; set; }
    public List<byte> PartNos { get; set; } = [];
    public List<AttemptQuestionDto> Questions { get; set; } = [];
    public List<PlayGroupDto>? Content { get; set; } = [];
}
