namespace ToeicMind.DTOs.Learning.Response;

/// <summary>
/// Một bộ clip Nghe chép kèm tiến độ của người học. SourceKind EXAM: các câu cắt từ một nhóm câu hỏi Nghe của đề gốc;
/// STANDALONE: bộ clip sưu tầm (UC-28 TH2), không có nhóm/đề/bộ đề (các trường đó null), SourceNote là ghi chú nguồn.
/// </summary>
public class DictationItemDto
{
    public int ItemId { get; set; }
    public string SourceKind { get; set; } = "EXAM";
    public string? SourceNote { get; set; }
    public int? GroupId { get; set; }
    public int? ExamId { get; set; }
    public string? ExamCode { get; set; }
    public string? ExamTitle { get; set; }
    public int? ExamSetId { get; set; }
    public string? ExamSetName { get; set; }
    public byte PartNo { get; set; }
    public short? GroupOrder { get; set; }
    public short? FirstQuestionNo { get; set; }
    public int CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public byte? LevelNo { get; set; }
    public string? LevelName { get; set; }
    public List<int> SpecialTagIds { get; set; } = [];
    public int ClipCount { get; set; }
    public double? DurationSeconds { get; set; }
    public int PracticeCount { get; set; }
    public decimal? LastAccuracy { get; set; }
    public decimal? BestAccuracy { get; set; }
    public string? LastMode { get; set; }
    public DateTime? LastPracticedAt { get; set; }
    /// <summary>NEW (chưa luyện), NEEDS_PRACTICE (độ chính xác lần gần nhất thấp hơn ngưỡng), DONE.</summary>
    public string Status { get; set; } = string.Empty;
    /// <summary>Bộ đề đặt quyền Nghe là VIP mà người dùng hiện tại chưa có VIP: xem được trong danh sách nhưng mở nội dung nhận 402 VIP_REQUIRED.</summary>
    public bool IsLocked { get; set; }
}
