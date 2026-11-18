namespace ToeicMind.DTOs.Exams.Response;
public class ExamDirectionDto
{
    public int DirectionId { get; set; }
    public int? ExamId { get; set; }
    public string DirectionKind { get; set; } = string.Empty;
    public string? Skill { get; set; }
    public byte? PartNo { get; set; }
    public string DirectionsEn { get; set; } = string.Empty;
    public string? DirectionsVi { get; set; }
    public string? ExampleEn { get; set; }
    public string? ExampleVi { get; set; }
    public List<MediaFileDto> Media { get; set; } = [];
}
