using System.ComponentModel.DataAnnotations;

namespace ToeicMind.DTOs.Learning.Request;

/// <summary>
/// Bộ lọc danh sách bộ clip Nghe chép. Lọc theo bộ đề gốc, đề, Part (1–4), loại bài (gồm cả loại con), Level, dạng đặc biệt
/// và trạng thái (NEW chưa luyện, PRACTICED đã luyện, NEEDS_PRACTICE câu cần luyện, DONE đã đạt).
/// </summary>
public class DictationItemListRequestDto
{
    [Range(1, 1000000)]
    public int Page { get; set; } = 1;
    [Range(1, 100)]
    public int PageSize { get; set; } = 20;
    [Range(1, int.MaxValue)]
    public int? ExamSetId { get; set; }
    [Range(1, int.MaxValue)]
    public int? ExamId { get; set; }
    [Range(1, 4)]
    public byte? PartNo { get; set; }
    [Range(1, int.MaxValue)]
    public int? CategoryId { get; set; }
    [Range(1, 255)]
    public byte? LevelNo { get; set; }
    [Range(1, int.MaxValue)]
    public int? SpecialTagId { get; set; }
    [RegularExpression("^(NEW|PRACTICED|NEEDS_PRACTICE|DONE)$", ErrorMessage = "Status chỉ nhận NEW, PRACTICED, NEEDS_PRACTICE hoặc DONE")]
    public string? Status { get; set; }
    /// <summary>EXAM: chỉ bộ clip cắt từ đề; STANDALONE: chỉ bộ clip sưu tầm (UC-28 TH2); bỏ trống: cả hai.</summary>
    [RegularExpression("^(EXAM|STANDALONE)$", ErrorMessage = "Source chỉ nhận EXAM hoặc STANDALONE")]
    public string? Source { get; set; }
}
