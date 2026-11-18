namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Tiến độ Nghe chép của một bộ clip sau khi ghi nhận một lượt luyện.</summary>
public class DictationProgressDto
{
    public int ItemId { get; set; }
    public int PracticeCount { get; set; }
    public decimal? LastAccuracy { get; set; }
    public decimal? BestAccuracy { get; set; }
    public string? LastMode { get; set; }
    public DateTime LastPracticedAt { get; set; }
    public string Status { get; set; } = string.Empty;
}
