using System.ComponentModel.DataAnnotations;

namespace ToeicMind.DTOs.Learning.Request;

/// <summary>Chia các từ trong một phạm vi (bộ đề → đề → Part, hoặc từ của tôi) thành các "bài học" nhỏ theo thứ tự nhập đề, mỗi bài Size từ.</summary>
public class VocabLessonListRequestDto
{
    [Range(1, int.MaxValue)] public int? ExamSetId { get; set; }
    [Range(1, int.MaxValue)] public int? ExamId { get; set; }
    [Range(1, 7)] public byte? PartNo { get; set; }
    public bool Mine { get; set; }
    [RegularExpression("^(A1|A2|B1|B2|C1|C2)$", ErrorMessage = "CefrLevel chỉ nhận A1, A2, B1, B2, C1 hoặc C2")]
    public string? CefrLevel { get; set; }
    [Range(5, 30)] public int Size { get; set; } = 10;
}
