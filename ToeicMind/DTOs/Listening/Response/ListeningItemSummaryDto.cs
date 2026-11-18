namespace ToeicMind.DTOs.Listening.Response;

/// <summary>Một bộ clip sưu tầm (TH2) trong danh sách Admin.</summary>
public class ListeningItemSummaryDto
{
    public int ItemId { get; set; }
    public byte PartNo { get; set; }
    public int? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public byte? LevelNo { get; set; }
    public string? LevelName { get; set; }
    public string? SourceNote { get; set; }
    public bool IsPublished { get; set; }
    public bool IsDeleted { get; set; }
    public int ClipCount { get; set; }
    /// <summary>Số clip đã có audio; nhỏ hơn ClipCount thì người học gặp clip "chưa có âm thanh".</summary>
    public int AudioCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
