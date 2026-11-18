namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Một đề (Test) trong bộ đề kèm thẻ Part 1–4 để nghe chép.</summary>
public class DictationExamDto
{
    public int ExamId { get; set; }
    public string ExamCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public bool IsLocked { get; set; }
    public List<DictationPartCardDto> Parts { get; set; } = [];
}
