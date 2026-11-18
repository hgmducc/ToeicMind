using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ToeicMind.DTOs.Exams.Request;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class SaveExamSetRequestDto
{
    [Required, MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }

    /// <summary>Quyền theo từng tính năng của bộ đề (FREE hoặc VIP, mặc định FREE): làm đề, từ vựng, Nghe (Nghe chép + ngân hàng Part 1–4), Đọc (ngân hàng Part 5–7 + Ngữ pháp).</summary>
    [RegularExpression("^(FREE|VIP)$", ErrorMessage = "Chỉ nhận FREE hoặc VIP")]
    public string ExamAccess { get; set; } = "FREE";

    [RegularExpression("^(FREE|VIP)$", ErrorMessage = "Chỉ nhận FREE hoặc VIP")]
    public string VocabAccess { get; set; } = "FREE";

    [RegularExpression("^(FREE|VIP)$", ErrorMessage = "Chỉ nhận FREE hoặc VIP")]
    public string ListeningAccess { get; set; } = "FREE";

    [RegularExpression("^(FREE|VIP)$", ErrorMessage = "Chỉ nhận FREE hoặc VIP")]
    public string ReadingAccess { get; set; } = "FREE";
}
