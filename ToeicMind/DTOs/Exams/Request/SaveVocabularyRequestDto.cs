using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ToeicMind.DTOs.Exams.Request;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class SaveVocabularyRequestDto
{
    [Required, MaxLength(100)] public string Term { get; set; } = string.Empty;
    [Required, MaxLength(100)] public string Base { get; set; } = string.Empty;
    [Required, RegularExpression(@"^(?:n|v|adj|adv|prep|phr\.v|phr)$")] public string Pos { get; set; } = string.Empty;
    [MaxLength(100)] public string? Ipa { get; set; }
    [Required, RegularExpression("A1|A2|B1|B2|C1|C2")] public string Cefr { get; set; } = string.Empty;
    [Required, MaxLength(500)] public string MeaningBase { get; set; } = string.Empty;
    [MaxLength(500)] public string? TermMeaningVi { get; set; }
    [MaxLength(1000)] public string? DefinitionEn { get; set; }
    [MaxLength(1000)] public string? ExampleEn { get; set; }
    [MaxLength(1000)] public string? ExampleVi { get; set; }
}
