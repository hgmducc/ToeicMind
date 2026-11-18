using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace ToeicMind.Models.Exams;

[Table("QuestionGroup", Schema = "dbo")]
public class QuestionGroup
{
    [Key]
    public int GroupId { get; set; }
    public int ExamId { get; set; }
    public byte PartNo { get; set; }
    public short GroupOrder { get; set; }
    public int CategoryId { get; set; }
    public byte? GroupLevelNo { get; set; }
    public string? PassageHtml { get; set; }
    public string? TranscriptEn { get; set; }
    public string? TranslationVi { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    [ForeignKey(nameof(ExamId)), DeleteBehavior(DeleteBehavior.NoAction)]
    public Exam Exam { get; set; } = null!;
    public List<Question> Questions { get; set; } = [];
    public List<QuestionGroupTag> Tags { get; set; } = [];
    public List<MediaFile> Media { get; set; } = [];
    public List<ListeningItem> ListeningItems { get; set; } = [];
    [NotMapped] public bool ReplaceAudioSegments { get; set; }
}
