using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ToeicMind.DTOs.Grammar.Request;

/// <summary>
/// Admin tạo/sửa bài ngữ pháp (UC-25). Mỗi chủ điểm chỉ có một bài học tương tác: từng phần lý thuyết kèm cấu trúc, ví dụ và bài tập,
/// cuối bài có mẹo TOEIC. Content là HTML, được lọc trước khi lưu (giữ các class khung: grammar-structure, grammar-example, grammar-tip,
/// bài tập grammar-exercise / grammar-options / grammar-correct / grammar-explain).
/// </summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class SaveGrammarArticleRequestDto
{
    [Required, Range(1, int.MaxValue)]
    public int? GrammarTopicId { get; set; }
    [Required(ErrorMessage = "Cần nhập tiêu đề"), MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    [Required(ErrorMessage = "Cần nhập nội dung"), MaxLength(500_000)]
    public string Content { get; set; } = string.Empty;
}
