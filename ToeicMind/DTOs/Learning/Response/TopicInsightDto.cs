namespace ToeicMind.DTOs.Learning.Response;

/// <summary>
/// Một chủ điểm (thẻ chủ điểm của ngân hàng câu hỏi, gồm cả loại con) và kết quả của người học. CardKey dùng trực tiếp cho POST /api/bank/attempts.
/// </summary>
public class TopicInsightDto
{
    public byte PartNo { get; set; }
    public int CategoryId { get; set; }
    public string CardKey { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int TotalQuestions { get; set; }
    public int Answered { get; set; }
    public int Correct { get; set; }
    public int Wrong { get; set; }
    public double? AccuracyPercent { get; set; }
}
