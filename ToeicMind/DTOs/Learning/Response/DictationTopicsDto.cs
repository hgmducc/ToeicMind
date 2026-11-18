namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Bộ lọc "Theo chủ đề" của Nghe chép: loại bài, Level và dạng đặc biệt, kèm số bộ clip/clip có thể luyện.</summary>
public class DictationTopicsDto
{
    public byte? PartNo { get; set; }
    public List<DictationCategoryDto> Categories { get; set; } = [];
    public List<DictationLevelDto> Levels { get; set; } = [];
    public List<DictationTagDto> SpecialTags { get; set; } = [];
}
