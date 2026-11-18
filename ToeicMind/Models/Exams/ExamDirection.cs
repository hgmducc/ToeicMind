using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ToeicMind.Models.Exams;

[Table("ExamDirection", Schema = "dbo")]
public class ExamDirection
{
    [Key]
    public int DirectionId { get; set; }
    public int? ExamId { get; set; }
    [Column(TypeName = "varchar(10)")]
    public string DirectionKind { get; set; } = string.Empty;
    [Column(TypeName = "varchar(10)")]
    public string? Skill { get; set; }
    public byte? PartNo { get; set; }
    public string DirectionsEn { get; set; } = string.Empty;
    public string? DirectionsVi { get; set; }
    public string? ExampleEn { get; set; }
    public string? ExampleVi { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public List<MediaFile> Media { get; set; } = [];
}
