namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Hướng dẫn hiệu lực của đề cho một phần thi hoặc một Part (kèm audio nếu có).</summary>
public class PlayDirectionDto
{
    public string DirectionKind { get; set; } = string.Empty;
    public string? Skill { get; set; }
    public byte? PartNo { get; set; }
    public string DirectionsEn { get; set; } = string.Empty;
    public string? DirectionsVi { get; set; }
    public string? ExampleEn { get; set; }
    public string? ExampleVi { get; set; }
    public List<PlayMediaDto> Media { get; set; } = [];
}
