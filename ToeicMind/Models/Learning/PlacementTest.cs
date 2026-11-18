using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ToeicMind.Models.Learning;

/// <summary>
/// Bài kiểm tra đầu vào (CHG-007) do Admin ghép từ các nhóm câu hỏi của đề đã có. Tối đa một bài đang dùng (IsActive);
/// xóa mềm phải tắt trước. Thời gian làm bài cố định theo TimeLimitSeconds.
/// </summary>
[Table("PlacementTest", Schema = "dbo")]
public class PlacementTest
{
    [Key]
    public int PlacementTestId { get; set; }
    [MaxLength(150)]
    public string Title { get; set; } = string.Empty;
    [MaxLength(1000)]
    public string? Description { get; set; }
    public int TimeLimitSeconds { get; set; }
    public bool IsActive { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public int CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<PlacementTestGroup> Groups { get; set; } = [];
}
