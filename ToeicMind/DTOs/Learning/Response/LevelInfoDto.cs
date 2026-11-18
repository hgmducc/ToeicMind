namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Một Level của bảng LevelBand (thang điểm từng kỹ năng 5–495).</summary>
public class LevelInfoDto
{
    public byte LevelNo { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ShortLabel { get; set; } = string.Empty;
}
