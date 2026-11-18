namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Một Level trong bộ lọc Nghe chép kèm số bộ clip và clip.</summary>
public class DictationLevelDto
{
    public byte LevelNo { get; set; }
    public string Name { get; set; } = string.Empty;
    public int ItemCount { get; set; }
    public int ClipCount { get; set; }
}
