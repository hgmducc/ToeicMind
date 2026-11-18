using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
namespace ToeicMind.DTOs.Exams.Request;
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class SaveQuestionRequestDto
{
    [Range(1,int.MaxValue)]
    public int? QuestionId { get; set; }
    [Range(1,200)]
    public short QuestionNo { get; set; }
    [Range(1,4)]
    public byte? LevelNo { get; set; }
    [MaxLength(50000)]
    public string? QuestionText { get; set; }
    [MaxLength(50000)]
    public string? Explanation { get; set; }
    [MaxLength(20000)]
    public string? OptionExplanations { get; set; }
    [Required, MaxLength(4)]
    public List<SaveQuestionOptionRequestDto> Options { get; set; } = [];
    [MaxLength(200)]
    public List<SaveVocabularyRequestDto>? Vocabularies { get; set; }
}
