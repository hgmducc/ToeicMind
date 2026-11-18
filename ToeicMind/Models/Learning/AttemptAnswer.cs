using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ToeicMind.Models.Learning;

/// <summary>Đáp án của một câu trong một lần làm bài. Dòng được tạo sẵn cho mọi câu khi bắt đầu; SelectedOptionId NULL nghĩa là chưa trả lời.</summary>
[Table("AttemptAnswer", Schema = "dbo")]
public class AttemptAnswer
{
    [Key]
    public long AttemptAnswerId { get; set; }
    public int AttemptId { get; set; }
    public int QuestionId { get; set; }
    public int? SelectedOptionId { get; set; }

    /// <summary>PRACTICE: có ngay khi trả lời; EXAM: chốt khi nộp.</summary>
    public bool? IsCorrect { get; set; }
    public DateTime? DisplayedAt { get; set; }
    public DateTime? AnsweredAt { get; set; }
}
