using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using ToeicMind.Models.Exams;

namespace ToeicMind.Models.Learning;

/// <summary>Một nhóm câu hỏi (trọn nhóm, giữ nguyên đoạn văn/audio) thuộc bài kiểm tra đầu vào, theo thứ tự SortOrder.</summary>
[Table("PlacementTestGroup", Schema = "dbo")]
[PrimaryKey(nameof(PlacementTestId), nameof(GroupId))]
public class PlacementTestGroup
{
    public int PlacementTestId { get; set; }
    public int GroupId { get; set; }
    public short SortOrder { get; set; }
    [ForeignKey(nameof(PlacementTestId)), DeleteBehavior(DeleteBehavior.NoAction)]
    public PlacementTest Test { get; set; } = null!;
    [ForeignKey(nameof(GroupId)), DeleteBehavior(DeleteBehavior.NoAction)]
    public QuestionGroup Group { get; set; } = null!;
}
