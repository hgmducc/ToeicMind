using System.ComponentModel.DataAnnotations;

namespace ToeicMind.DTOs.Learning.Request;

/// <summary>Lọc danh sách từ vựng theo bộ đề → đề → Part, mức CEFR, trạng thái học, từ khóa; Mine = chỉ từ trong bộ từ cá nhân.</summary>
public class VocabWordListRequestDto
{
    [Range(1, int.MaxValue)] public int? ExamSetId { get; set; }
    [Range(1, int.MaxValue)] public int? ExamId { get; set; }
    [Range(1, 7)] public byte? PartNo { get; set; }
    [RegularExpression("^(A1|A2|B1|B2|C1|C2)$", ErrorMessage = "CefrLevel chỉ nhận A1, A2, B1, B2, C1 hoặc C2")]
    public string? CefrLevel { get; set; }
    [RegularExpression("^(NEW|LEARNING|MASTERED|DUE)$", ErrorMessage = "Status chỉ nhận NEW, LEARNING, MASTERED hoặc DUE")]
    public string? Status { get; set; }
    [MaxLength(100)] public string? Search { get; set; }
    public bool Mine { get; set; }
    [Range(1, 1000000)] public int Page { get; set; } = 1;
    [Range(1, 100)] public int PageSize { get; set; } = 30;
}
