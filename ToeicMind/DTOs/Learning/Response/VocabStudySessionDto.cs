namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Phiên học từ: các thẻ và số còn lại trong phạm vi đã chọn. Pool là các từ khác để làm đáp án gây nhiễu (trắc nghiệm, trò chơi).</summary>
public class VocabStudySessionDto
{
    public List<VocabCardDto> Cards { get; set; } = [];
    public int DueTotal { get; set; }
    public int NewTotal { get; set; }
    public List<VocabChoiceDto> Pool { get; set; } = [];
}
