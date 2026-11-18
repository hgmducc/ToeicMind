using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ToeicMind.DTOs.Exams.Request;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class SaveAudioSegmentRequestDto
{
    [Range(1, int.MaxValue)] public int? ClipId { get; set; }
    [Range(1, 32767)] public short Seq { get; set; }
    [Required, MaxLength(100)] public string ClipKey { get; set; } = string.Empty;
    [Required, RegularExpression("QUESTION|OPTION_A|OPTION_B|OPTION_C|OPTION_D|SENTENCE")]
    public string Role { get; set; } = string.Empty;
    [Required, MaxLength(1000)] public string Text { get; set; } = string.Empty;
    [MaxLength(1000)] public string? TranslationVi { get; set; }
    [MaxLength(100)] public string? Speaker { get; set; }
    [MaxLength(500)] public string? SourceAudio { get; set; }
    [MaxLength(500)] public string? ClipAudio { get; set; }
    [MaxLength(100)] public string? TextSource { get; set; }
    [Range(0, 86400)] public double? StartSec { get; set; }
    [Range(0, 86400)] public double? EndSec { get; set; }
    [Range(0, 86400)] public double? DurationSec { get; set; }
}
