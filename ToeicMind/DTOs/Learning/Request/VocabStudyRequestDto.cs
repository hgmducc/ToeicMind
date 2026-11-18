using System.ComponentModel.DataAnnotations;

namespace ToeicMind.DTOs.Learning.Request;

/// <summary>
/// Tạo một phiên học từ. Mode: MIXED (mặc định: từ đến hạn trước, rồi từ mới), REVIEW (chỉ ôn), NEW (chỉ từ mới),
/// PRACTICE (luyện tự do: lấy ngẫu nhiên từ mọi từ trong phạm vi, kể cả từ chưa đến hạn).
/// Ids (danh sách VocabId cách nhau dấu phẩy, tối đa 100) dùng khi học một "bài" cụ thể; khi có Ids thì bỏ qua Mode.
/// CefrLevel thu hẹp theo mức CEFR.
/// </summary>
public class VocabStudyRequestDto
{
    [Range(1, int.MaxValue)] public int? ExamSetId { get; set; }
    [Range(1, int.MaxValue)] public int? ExamId { get; set; }
    [Range(1, 7)] public byte? PartNo { get; set; }
    public bool Mine { get; set; }
    [RegularExpression("^(MIXED|REVIEW|NEW|PRACTICE)$", ErrorMessage = "Mode chỉ nhận MIXED, REVIEW, NEW hoặc PRACTICE")]
    public string Mode { get; set; } = "MIXED";
    [Range(1, 100)] public int? Limit { get; set; }
    [Range(0, 50)] public int? NewLimit { get; set; }
    [RegularExpression("^(A1|A2|B1|B2|C1|C2)$", ErrorMessage = "CefrLevel chỉ nhận A1, A2, B1, B2, C1 hoặc C2")]
    public string? CefrLevel { get; set; }
    [RegularExpression(@"^\d{1,9}(,\d{1,9}){0,99}$", ErrorMessage = "Ids là danh sách VocabId cách nhau dấu phẩy, tối đa 100")]
    public string? Ids { get; set; }
}
