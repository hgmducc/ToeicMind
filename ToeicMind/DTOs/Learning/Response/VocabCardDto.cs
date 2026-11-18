namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Thẻ học một từ. Kind: NEW hoặc REVIEW. PreviewMinutes là thời gian đến lần ôn kế tiếp (phút) cho từng mức đánh giá 0–3 để hiện trên nút.</summary>
public class VocabCardDto
{
    public VocabWordDto Word { get; set; } = null!;
    public string Kind { get; set; } = "NEW";
    public List<VocabContextDto> Contexts { get; set; } = [];
    public int[] PreviewMinutes { get; set; } = [];
}
