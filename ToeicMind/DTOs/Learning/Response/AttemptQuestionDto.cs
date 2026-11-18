namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Một câu trong lần làm bài và trạng thái trả lời hiện tại.</summary>
public class AttemptQuestionDto
{
    public int QuestionId { get; set; }
    public byte PartNo { get; set; }
    public short QuestionNo { get; set; }
    public int GroupId { get; set; }
    public int? SelectedOptionId { get; set; }
    public bool? IsCorrect { get; set; }
}
