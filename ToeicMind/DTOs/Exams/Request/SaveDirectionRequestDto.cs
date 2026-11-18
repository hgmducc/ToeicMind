using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
namespace ToeicMind.DTOs.Exams.Request;
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class SaveDirectionRequestDto
{
    [Range(1,int.MaxValue)]
    public int? ExamId { get; set; }
    [Required, RegularExpression("SECTION|PART")]
    public string DirectionKind { get; set; } = string.Empty;
    [RegularExpression("LISTENING|READING")]
    public string? Skill { get; set; }
    [Range(1,7)]
    public byte? PartNo { get; set; }
    [Required, MaxLength(50000)]
    public string DirectionsEn { get; set; } = string.Empty;
    [MaxLength(50000)]
    public string? DirectionsVi { get; set; }
    [MaxLength(50000)]
    public string? ExampleEn { get; set; }
    [MaxLength(50000)]
    public string? ExampleVi { get; set; }
}
