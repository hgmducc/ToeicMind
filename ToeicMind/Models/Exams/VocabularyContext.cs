using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace ToeicMind.Models.Exams;

[Table("VocabularyContext", Schema = "dbo")]
public class VocabularyContext
{
    [Key] public int ContextId { get; set; }
    public int VocabId { get; set; }
    public int? QuestionId { get; set; }
    public int? ClipId { get; set; }
    [MaxLength(100)] public string? SurfaceForm { get; set; }
    [MaxLength(500)] public string? ContextMeaningVi { get; set; }
    [MaxLength(1000)] public string? ExampleEn { get; set; }
    [MaxLength(1000)] public string? ExampleVi { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    [ForeignKey(nameof(VocabId)), DeleteBehavior(DeleteBehavior.NoAction)]
    public Vocabulary Vocabulary { get; set; } = null!;
    [ForeignKey(nameof(QuestionId)), DeleteBehavior(DeleteBehavior.NoAction)]
    public Question? Question { get; set; }
}
