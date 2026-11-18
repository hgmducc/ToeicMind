namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Các bài học của một phạm vi từ vựng.</summary>
public class VocabLessonListDto
{
    public int TotalWords { get; set; }
    public int Size { get; set; }
    public List<VocabLessonDto> Lessons { get; set; } = [];
}
