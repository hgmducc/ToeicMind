namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Một tệp media kèm link đọc có hạn (ký tại thời điểm trả lời). ClipId chỉ có ở Nghe chép (clip cắt); làm đề luôn để trống.</summary>
public class PlayMediaDto
{
    public int MediaId { get; set; }
    public int? ClipId { get; set; }
    public string MediaType { get; set; } = string.Empty;
    public string? AltText { get; set; }
    public byte SortOrder { get; set; }
    public string Url { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}
