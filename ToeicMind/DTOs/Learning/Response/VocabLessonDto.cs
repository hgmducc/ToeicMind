namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Một bài học nhỏ: danh sách từ, tiến độ của người học và vài từ xem trước.</summary>
public class VocabLessonDto
{
    public int Number { get; set; }
    public List<int> WordIds { get; set; } = [];
    public int WordCount { get; set; }
    public int LearnedCount { get; set; }
    public int MasteredCount { get; set; }
    public int DueCount { get; set; }
    public List<string> Preview { get; set; } = [];
}
