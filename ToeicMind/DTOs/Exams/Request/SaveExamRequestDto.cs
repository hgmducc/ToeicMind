using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ToeicMind.DTOs.Exams.Request;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class SaveExamRequestDto
{
    [Range(1, int.MaxValue)]
    public int ExamSetId { get; set; }

    [MaxLength(30), RegularExpression(@"[A-Za-z0-9][A-Za-z0-9_-]*")]
    public string? ExamCode { get; set; }

    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }

    /// <summary>Quyền làm đề: FREE hoặc VIP; bỏ trống = theo quyền ExamAccess của bộ đề.</summary>
    [RegularExpression("^(FREE|VIP)$", ErrorMessage = "AccessLevel chỉ nhận FREE hoặc VIP")]
    public string? AccessLevel { get; set; }
}
