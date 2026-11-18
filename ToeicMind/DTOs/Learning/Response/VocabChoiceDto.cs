namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Từ dùng làm đáp án gây nhiễu trong trắc nghiệm và trò chơi (không kèm tiến độ).</summary>
public class VocabChoiceDto
{
    public int VocabId { get; set; }
    public string Lemma { get; set; } = string.Empty;
    public string PosCode { get; set; } = string.Empty;
    public string MeaningVi { get; set; } = string.Empty;
}
