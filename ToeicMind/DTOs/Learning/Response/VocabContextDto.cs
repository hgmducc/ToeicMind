namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Ngữ cảnh của từ trong đề: dạng xuất hiện, nghĩa theo ngữ cảnh và câu ví dụ.</summary>
public class VocabContextDto
{
    public string? SurfaceForm { get; set; }
    public string? MeaningVi { get; set; }
    public string? ExampleEn { get; set; }
    public string? ExampleVi { get; set; }
}
