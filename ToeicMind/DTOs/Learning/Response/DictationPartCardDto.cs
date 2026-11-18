namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Thẻ một Part (1–4) của một đề trong Nghe chép: số bộ clip, số clip và tiến độ của người học.</summary>
public class DictationPartCardDto
{
    public byte PartNo { get; set; }
    public string PartName { get; set; } = string.Empty;
    public int ItemCount { get; set; }
    /// <summary>Số clip cắt (câu để nghe chép) của Part trong đề này.</summary>
    public int ClipCount { get; set; }
    public int PracticedItems { get; set; }
    public int NeedsPracticeItems { get; set; }
    /// <summary>NEW (chưa bắt đầu), IN_PROGRESS, DONE.</summary>
    public string Status { get; set; } = string.Empty;
}
