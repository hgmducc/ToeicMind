namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Một bộ đề gốc (tab) trong Nghe chép, chỉ gồm các đề đã xuất bản có clip.</summary>
public class DictationSetDto
{
    public int ExamSetId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int ExamCount { get; set; }
    public int ItemCount { get; set; }
    public int ClipCount { get; set; }
    public int PracticedItems { get; set; }
    public int NeedsPracticeItems { get; set; }
    /// <summary>Quyền Nghe của bộ đề (FREE hoặc VIP).</summary>
    public string Access { get; set; } = "FREE";
    public bool IsLocked { get; set; }
}
