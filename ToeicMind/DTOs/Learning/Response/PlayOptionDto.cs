namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Một phương án trả lời (không có cờ đúng/sai).</summary>
public class PlayOptionDto
{
    public int OptionId { get; set; }
    public string OptionLabel { get; set; } = string.Empty;
    public string OptionText { get; set; } = string.Empty;
}
