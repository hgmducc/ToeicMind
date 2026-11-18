using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
namespace ToeicMind.DTOs.Exams.Request;
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class SaveGroupRequestDto
{
    [Range(1,7)]
    public byte PartNo { get; set; }
    [Range(1,200)]
    public short? GroupOrder { get; set; }
    [Range(1,int.MaxValue)]
    public int CategoryId { get; set; }
    [Range(1,4)]
    public byte? GroupLevelNo { get; set; }
    [MaxLength(200000)]
    public string? PassageHtml { get; set; }
    [MaxLength(50000)]
    public string? TranscriptEn { get; set; }
    [MaxLength(50000)]
    public string? TranslationVi { get; set; }
    [Required, MaxLength(5)]
    public List<int> SpecialTagIds { get; set; } = [];
    [Required, MaxLength(5)]
    public List<SaveQuestionRequestDto> Questions { get; set; } = [];
    [MaxLength(500)]
    public List<SaveAudioSegmentRequestDto>? AudioSegments { get; set; }
}
