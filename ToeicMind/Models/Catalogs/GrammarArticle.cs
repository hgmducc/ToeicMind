using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ToeicMind.Models.Catalogs;

/// <summary>
/// Bài học ngữ pháp (UC-18, UC-25): mỗi chủ điểm đúng một bài chưa xóa (UX_GrammarArticle_Topic) gồm lý thuyết, cấu trúc, ví dụ mẫu,
/// bài tập mẫu và mẹo TOEIC; nội dung HTML đã lọc, xóa mềm. SortOrder giữ mặc định 1 (không dùng khi mỗi chủ điểm một bài).
/// </summary>
[Table("GrammarArticle", Schema = "dbo")]
public class GrammarArticle
{
    [Key]
    public int ArticleId { get; set; }
    public int GrammarTopicId { get; set; }
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public short SortOrder { get; set; } = 1;
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
