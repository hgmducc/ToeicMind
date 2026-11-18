using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
namespace ToeicMind.DTOs.Exams.Request;
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class SaveQuestionOptionRequestDto
{
    [Required, RegularExpression("[A-D]")]
    public string OptionLabel { get; set; } = string.Empty;
    [MaxLength(1000)]
    public string OptionText { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
}
