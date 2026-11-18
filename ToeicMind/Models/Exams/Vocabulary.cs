using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ToeicMind.Models.Exams;

[Table("Vocabulary", Schema = "dbo")]
public class Vocabulary
{
    [Key] public int VocabId { get; set; }
    [MaxLength(100)] public string Lemma { get; set; } = string.Empty;
    [Column(TypeName = "varchar(10)")] public string PosCode { get; set; } = string.Empty;
    [MaxLength(100)] public string? IpaUs { get; set; }
    [MaxLength(100)] public string? IpaUk { get; set; }
    [Column(TypeName = "char(2)")] public string CefrLevel { get; set; } = string.Empty;
    [MaxLength(500)] public string MeaningVi { get; set; } = string.Empty;
    [MaxLength(1000)] public string? DefinitionEn { get; set; }
    public int? VocabTopicId { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
