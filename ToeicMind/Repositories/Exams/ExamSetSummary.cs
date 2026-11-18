using ToeicMind.Models.Exams;

namespace ToeicMind.Repositories.Exams;

/// <summary>Kết quả truy vấn gộp: bộ đề kèm số đề liên quan.</summary>
public class ExamSetSummary
{
    public ExamSet ExamSet { get; set; } = null!;
    public int ExamCount { get; set; }
    public int PublishedExamCount { get; set; }
}
