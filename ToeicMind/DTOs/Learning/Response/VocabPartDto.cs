namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Số từ vựng của một Part trong một đề và tiến độ học của người dùng.</summary>
public class VocabPartDto
{
    public byte PartNo { get; set; }
    public string PartName { get; set; } = string.Empty;
    public int WordCount { get; set; }
    public int LearnedCount { get; set; }
    public int MasteredCount { get; set; }
    public int DueCount { get; set; }
}
