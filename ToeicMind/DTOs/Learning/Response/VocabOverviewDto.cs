namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Tổng quan học từ vựng: số từ theo trạng thái, số từ đến hạn ôn, tiến độ hôm nay và các bộ đề.</summary>
public class VocabOverviewDto
{
    public int TotalWords { get; set; }
    public int NewWords { get; set; }
    public int LearningWords { get; set; }
    public int MasteredWords { get; set; }
    public int DueNow { get; set; }
    public int NewToday { get; set; }
    public int ReviewedToday { get; set; }
    public int NewPerDay { get; set; }
    /// <summary>Số từ là nội dung VIP mà người dùng chưa mở khóa (không tính vào TotalWords và không xuất hiện trong danh sách/phiên học).</summary>
    public int LockedWords { get; set; }
    public List<VocabSetDto> Sets { get; set; } = [];
}
