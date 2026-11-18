using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ToeicMind.Models.Learning;

/// <summary>Lượt làm bài kiểm tra đầu vào: Attempt (Scope = PLACEMENT) gắn với bài kiểm tra đã dùng. Bảng riêng để chức năng cũ không phụ thuộc cột mới của Attempt.</summary>
[Table("PlacementAttempt", Schema = "dbo")]
public class PlacementAttempt
{
    [Key, DatabaseGenerated(DatabaseGeneratedOption.None)]
    public int AttemptId { get; set; }
    public int PlacementTestId { get; set; }
}
