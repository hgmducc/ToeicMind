namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Số câu theo Part của một lần làm bài.</summary>
public class PartResultDto
{
    public byte PartNo { get; set; }
    public int Total { get; set; }
    public int Answered { get; set; }
    public int Correct { get; set; }
}
