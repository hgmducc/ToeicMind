namespace ToeicMind.DTOs.Exams.Response;
public class QuestionDto
{
    public List<QuestionVocabularyDto> Vocabularies { get; set; } = [];
    public int QuestionId { get; set; }
    public short QuestionNo { get; set; }
    public byte? LevelNo { get; set; }
    public string? QuestionText { get; set; }
    public string? Explanation { get; set; }
    public string? OptionExplanations { get; set; }
    public List<QuestionOptionDto> Options { get; set; } = [];
}
