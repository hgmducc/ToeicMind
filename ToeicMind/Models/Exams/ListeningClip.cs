using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace ToeicMind.Models.Exams;

[Table("ListeningClip", Schema = "dbo")]
public class ListeningClip
{
    [Key] public int ClipId { get; set; }
    public int ItemId { get; set; }
    public byte PartNo { get; set; }
    public short SeqNo { get; set; }
    [Column(TypeName = "varchar(10)")] public string ClipRole { get; set; } = string.Empty;
    [MaxLength(1000)] public string TranscriptEn { get; set; } = string.Empty;
    [MaxLength(1000)] public string? TranslationVi { get; set; }
    [MaxLength(100)] public string? ClipKey { get; set; }
    [MaxLength(100)] public string? Speaker { get; set; }
    [MaxLength(500)] public string? SourceAudio { get; set; }
    [MaxLength(500)] public string? ClipAudio { get; set; }
    [MaxLength(100)] public string? TextSource { get; set; }
    public double? StartSec { get; set; }
    public double? EndSec { get; set; }
    public double? DurationSec { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    [ForeignKey(nameof(ItemId)), DeleteBehavior(DeleteBehavior.NoAction)]
    public ListeningItem Item { get; set; } = null!;
    public List<MediaFile> Media { get; set; } = [];
}
