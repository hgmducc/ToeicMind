namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Một câu hỏi để làm bài (không lộ đáp án đúng).</summary>
public class PlayQuestionDto
{
    public int QuestionId { get; set; }
    public short QuestionNo { get; set; }
    public string? QuestionText { get; set; }
    public List<PlayOptionDto> Options { get; set; } = [];
}
