namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Số nhóm và số câu của một Part trong bài kiểm tra đầu vào.</summary>
public class PlacementPartDto
{
    public byte PartNo { get; set; }
    public int GroupCount { get; set; }
    public int QuestionCount { get; set; }
}
