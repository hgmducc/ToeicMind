namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Một nhóm câu hỏi để làm bài.</summary>
public class PlayGroupDto
{
    public int GroupId { get; set; }
    public int ExamId { get; set; }
    public byte PartNo { get; set; }
    public short GroupOrder { get; set; }
    public string? PassageHtml { get; set; }
    public List<PlayMediaDto> Media { get; set; } = [];
    public List<PlayQuestionDto> Questions { get; set; } = [];
}
