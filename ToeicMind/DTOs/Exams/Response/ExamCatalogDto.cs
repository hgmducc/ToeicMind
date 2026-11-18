namespace ToeicMind.DTOs.Exams.Response;
public class ExamCatalogDto
{
    public List<PartCatalogDto> Parts { get; set; } = [];
    public List<LevelCatalogDto> Levels { get; set; } = [];
    public List<CategoryCatalogDto> Categories { get; set; } = [];
    public List<SpecialTagCatalogDto> SpecialTags { get; set; } = [];
}
