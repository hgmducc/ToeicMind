namespace ToeicMind.DTOs.Learning.Response;

/// <summary>
/// Phân tích một Part theo lần trả lời gần nhất của từng câu (UserQuestionProgress). Status: UNTESTED (chưa đủ 3 câu), WEAK (dưới 60%),
/// FAIR (60–79%), STRONG (từ 80%).
/// </summary>
public class PartInsightDto
{
    public byte PartNo { get; set; }
    public string PartName { get; set; } = string.Empty;
    public string Skill { get; set; } = string.Empty;
    public int TotalQuestions { get; set; }
    public int Answered { get; set; }
    public int Correct { get; set; }
    public double? AccuracyPercent { get; set; }
    public string Status { get; set; } = string.Empty;
}
