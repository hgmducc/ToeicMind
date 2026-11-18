namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Một loại bài (phân loại câu hỏi) trong bộ lọc "Theo chủ đề"; số liệu đã cộng dồn các loại con.</summary>
public class DictationCategoryDto
{
    public int CategoryId { get; set; }
    public byte PartNo { get; set; }
    public int? ParentCategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsLeaf { get; set; }
    public int ItemCount { get; set; }
    public int ClipCount { get; set; }
    public int PracticedItems { get; set; }
}
