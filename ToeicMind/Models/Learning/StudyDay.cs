using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace ToeicMind.Models.Learning;

/// <summary>Ngày người học có hoạt động (để tính chuỗi ngày học). StudyDate theo múi giờ người học.</summary>
[Table("StudyDay", Schema = "dbo")]
[PrimaryKey(nameof(UserId), nameof(StudyDate))]
public class StudyDay
{
    public int UserId { get; set; }
    public DateOnly StudyDate { get; set; }
    public short AttemptCount { get; set; }
    public short ClipPracticeCount { get; set; }
    public int VocabReviewCount { get; set; }
}
