namespace ToeicMind.DTOs.Dashboard.Response;

/// <summary>Thống kê một câu khó: tỷ lệ trả lời sai.</summary>
public class QuestionStatDto
{
    public int QuestionId { get; set; }
    public int ExamId { get; set; }
    public string ExamCode { get; set; } = string.Empty;
    public byte PartNo { get; set; }
    public short QuestionNo { get; set; }
    public int Answers { get; set; }
    public int WrongAnswers { get; set; }
    public double WrongPercent { get; set; }
}
