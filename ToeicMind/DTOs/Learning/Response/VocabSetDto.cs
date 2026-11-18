namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Một bộ đề gốc trong trang từ vựng: số đề, số từ và tiến độ học.</summary>
public class VocabSetDto
{
    public int ExamSetId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int ExamCount { get; set; }
    public int WordCount { get; set; }
    public int LearnedCount { get; set; }
    public int MasteredCount { get; set; }
    public int DueCount { get; set; }
    /// <summary>Quyền từ vựng của bộ đề (FREE hoặc VIP).</summary>
    public string Access { get; set; } = "FREE";
    public bool IsLocked { get; set; }
}
