using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace ToeicMind.Models.Exams;

[Table("Media", Schema = "dbo")]
public class MediaFile
{
    [Key]
    public int MediaId { get; set; }
    public int? GroupId { get; set; }
    public byte? PartNo { get; set; }
    public int? ClipId { get; set; }
    public int? DirectionId { get; set; }
    [Column(TypeName = "varchar(10)")]
    public string MediaType { get; set; } = string.Empty;
    [MaxLength(500)]
    public string StorageKey { get; set; } = string.Empty;
    [MaxLength(300)]
    public string? AltText { get; set; }
    public byte SortOrder { get; set; } = 1;
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    [ForeignKey(nameof(GroupId)), DeleteBehavior(DeleteBehavior.NoAction)]
    public QuestionGroup? Group { get; set; }
    [ForeignKey(nameof(DirectionId)), DeleteBehavior(DeleteBehavior.NoAction)]
    public ExamDirection? Direction { get; set; }
    [ForeignKey(nameof(ClipId)), DeleteBehavior(DeleteBehavior.NoAction)]
    public ListeningClip? Clip { get; set; }
}
