namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Nội dung một Part để làm bài: chữ, đáp án (không có đáp án đúng, giải thích, transcript) và link media đã ký.</summary>
public class PartPlayDto
{
    public int ExamId { get; set; }
    public byte PartNo { get; set; }
    public List<PlayGroupDto> Groups { get; set; } = [];
}
