using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ToeicMind.Models.Learning;

/// <summary>Mục tiêu học của người học (CHG-007): điểm TOEIC mục tiêu, ngày thi dự kiến, số phút học mỗi ngày. Chưa có dòng = chưa đặt mục tiêu.</summary>
[Table("LearnerProfile", Schema = "dbo")]
public class LearnerProfile
{
    [Key, DatabaseGenerated(DatabaseGeneratedOption.None)]
    public int UserId { get; set; }
    /// <summary>10–990, bội số của 5.</summary>
    public short? TargetScore { get; set; }
    public DateOnly? ExamDate { get; set; }
    /// <summary>5–600 phút.</summary>
    public short? DailyMinutes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
