using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace ToeicMind.Models.Exams;

[Table("QuestionOption", Schema = "dbo")]
public class QuestionOption
{
    [Key]
    public int OptionId { get; set; }
    public int QuestionId { get; set; }
    [Column(TypeName = "char(1)")]
    public string OptionLabel { get; set; } = string.Empty;
    [MaxLength(1000)]
    public string OptionText { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
    [ForeignKey(nameof(QuestionId)), DeleteBehavior(DeleteBehavior.NoAction)]
    public Question Question { get; set; } = null!;
}
