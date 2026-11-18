namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Một đề trong bộ đề gốc: số từ vựng, tiến độ và các Part có từ vựng.</summary>
public class VocabExamDto
{
    public int ExamId { get; set; }
    public string ExamCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public int WordCount { get; set; }
    public int LearnedCount { get; set; }
    public int MasteredCount { get; set; }
    public int DueCount { get; set; }
    public bool IsLocked { get; set; }
    public List<VocabPartDto> Parts { get; set; } = [];
}
