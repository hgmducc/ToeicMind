namespace ToeicMind.DTOs.Exams.Response;

public class AudioSegmentDto
{
    public int ClipId { get; set; }
    public short Seq { get; set; }
    public string? ClipKey { get; set; }
    public string Role { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public string? TranslationVi { get; set; }
    public string? Speaker { get; set; }
    public string? SourceAudio { get; set; }
    public string? ClipAudio { get; set; }
    public string? TextSource { get; set; }
    public double? StartSec { get; set; }
    public double? EndSec { get; set; }
    public double? DurationSec { get; set; }
    public List<MediaFileDto> Media { get; set; } = [];
}
