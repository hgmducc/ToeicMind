namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Một dạng đặc biệt (Part 3, 4) trong bộ lọc Nghe chép.</summary>
public class DictationTagDto
{
    public int SpecialTagId { get; set; }
    public byte PartNo { get; set; }
    public string Name { get; set; } = string.Empty;
    public int ItemCount { get; set; }
    public int ClipCount { get; set; }
}
