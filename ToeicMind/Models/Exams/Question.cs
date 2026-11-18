using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace ToeicMind.Models.Exams;

[Table("Question", Schema = "dbo")]
public class Question
{
    [Key]
    public int QuestionId { get; set; }
    public int GroupId { get; set; }
    public int ExamId { get; set; }
    public short QuestionNo { get; set; }
    public byte? LevelNo { get; set; }
    public string? QuestionText { get; set; }
    public string? Explanation { get; set; }
    public string? OptionExplanations { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    [ForeignKey(nameof(GroupId)), DeleteBehavior(DeleteBehavior.NoAction)]
    public QuestionGroup Group { get; set; } = null!;
    public List<QuestionOption> Options { get; set; } = [];
    public List<VocabularyContext> Vocabularies { get; set; } = [];
    [NotMapped] public bool ReplaceVocabularies { get; set; }
}
