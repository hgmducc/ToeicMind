using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ToeicMind.Models.Learning;

/// <summary>Một lần làm bài của người học (Luyện thi, Luyện tập hoặc học theo ngân hàng). Các Part của lần làm suy ra từ AttemptAnswer.</summary>
[Table("Attempt", Schema = "dbo")]
public class Attempt
{
    [Key]
    public int AttemptId { get; set; }
    public int UserId { get; set; }

    /// <summary>NULL khi Scope = BANK.</summary>
    public int? ExamId { get; set; }

    [Column(TypeName = "varchar(10)")]
    public string Mode { get; set; } = AttemptMode.Practice;

    [Column(TypeName = "varchar(10)")]
    public string Scope { get; set; } = AttemptScope.Full;

    [Column(TypeName = "varchar(12)")]
    public string Status { get; set; } = AttemptStatus.InProgress;

    /// <summary>EXAM bắt buộc có; PRACTICE để NULL.</summary>
    public int? TimeLimitSeconds { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public bool IsAutoSubmitted { get; set; }

    /// <summary>Thời gian xem hướng dẫn, không tính vào đồng hồ thi (BR-27).</summary>
    public int DirectionSeconds { get; set; }
    public int? DurationSeconds { get; set; }
    public short TotalQuestions { get; set; }
    public short? CorrectCount { get; set; }
    public short? ListeningScaled { get; set; }
    public short? ReadingScaled { get; set; }
    public short? TotalScaled { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
}
