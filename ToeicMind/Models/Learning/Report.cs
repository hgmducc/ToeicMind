using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ToeicMind.Models.Learning;

/// <summary>Báo cáo lỗi nội dung của người học, gắn với đúng một đối tượng (câu hỏi hoặc từ vựng).</summary>
[Table("Report", Schema = "dbo")]
public class Report
{
    [Key]
    public int ReportId { get; set; }
    public int? ReporterId { get; set; }
    [Column(TypeName = "varchar(20)")]
    public string TargetType { get; set; } = string.Empty;
    public int? QuestionId { get; set; }
    public int? VocabId { get; set; }
    public int? ArticleId { get; set; }
    public int? ListeningItemId { get; set; }
    [Column(TypeName = "varchar(20)")]
    public string ErrorType { get; set; } = string.Empty;
    [MaxLength(1000)]
    public string? Description { get; set; }
    [Column(TypeName = "varchar(12)")]
    public string Status { get; set; } = ReportStatus.New;
    [MaxLength(1000)]
    public string? AdminNote { get; set; }
    public int? HandledBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? HandledAt { get; set; }
}

/// <summary>Giá trị của cột Report.Status.</summary>
public static class ReportStatus
{
    public const string New = "NEW";
    public const string InProgress = "IN_PROGRESS";
    public const string Resolved = "RESOLVED";
    public const string Rejected = "REJECTED";
}
