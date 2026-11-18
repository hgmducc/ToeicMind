namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Một clip (câu) để nghe chép: script, bản dịch và link audio đã ký. Client tự ẩn từ/script theo chế độ luyện và tự chấm độ chính xác.</summary>
public class DictationClipDto
{
    public int ClipId { get; set; }
    public short Seq { get; set; }
    public string Role { get; set; } = string.Empty;
    public string? Speaker { get; set; }
    public string TranscriptEn { get; set; } = string.Empty;
    public string? TranslationVi { get; set; }
    public double? DurationSeconds { get; set; }
    public List<PlayMediaDto> Audio { get; set; } = [];
}
