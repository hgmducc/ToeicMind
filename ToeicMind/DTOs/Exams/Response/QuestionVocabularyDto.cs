namespace ToeicMind.DTOs.Exams.Response;

public class QuestionVocabularyDto
{
    public int VocabId { get; set; }
    public string Term { get; set; } = string.Empty;
    public string Base { get; set; } = string.Empty;
    public string Pos { get; set; } = string.Empty;
    public string? Ipa { get; set; }
    public string Cefr { get; set; } = string.Empty;
    public string MeaningBase { get; set; } = string.Empty;
    public string? TermMeaningVi { get; set; }
    public string? DefinitionEn { get; set; }
    public string? ExampleEn { get; set; }
    public string? ExampleVi { get; set; }
}
