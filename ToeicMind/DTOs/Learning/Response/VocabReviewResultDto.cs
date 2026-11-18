namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Trạng thái của từ sau một lượt ôn.</summary>
public class VocabReviewResultDto
{
    public int VocabId { get; set; }
    public string Status { get; set; } = string.Empty;
    public int IntervalDays { get; set; }
    public short Repetitions { get; set; }
    public short Lapses { get; set; }
    public decimal EaseFactor { get; set; }
    public DateTime NextReviewAt { get; set; }
}
