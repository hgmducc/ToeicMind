using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ToeicMind.DTOs.Listening.Request;

/// <summary>
/// Một clip của bộ sưu tầm. Vai trò theo Part (E1): Part 1 OPTION_A–D; Part 2 QUESTION, OPTION_A–C; Part 3, 4 SENTENCE.
/// SeqNo bỏ trống khi thêm = nối vào cuối.
/// </summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class SaveListeningClipRequestDto
{
    [Range(1, short.MaxValue)]
    public short? SeqNo { get; set; }
    [Required, RegularExpression("^(QUESTION|OPTION_A|OPTION_B|OPTION_C|OPTION_D|SENTENCE)$", ErrorMessage = "ClipRole không hợp lệ")]
    public string ClipRole { get; set; } = string.Empty;
    [Required(ErrorMessage = "Cần nhập script tiếng Anh"), MaxLength(1000)]
    public string TranscriptEn { get; set; } = string.Empty;
    [MaxLength(1000)]
    public string? TranslationVi { get; set; }
    [MaxLength(100)]
    public string? Speaker { get; set; }
}
