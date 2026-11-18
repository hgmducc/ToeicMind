namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Tiến độ luyện của người học ở một Part (tính trên toàn bộ câu của các đề đã xuất bản).</summary>
public class PartProgressDto
{
    public byte PartNo { get; set; }
    public string PartName { get; set; } = string.Empty;
    public int TotalQuestions { get; set; }
    public int PracticedCount { get; set; }
    public int CorrectCount { get; set; }
    public int WrongCount { get; set; }
}
