namespace ToeicMind.DTOs.Exams.Response;

public class VocabularyImportNoticeDto
{
    public string Code { get; set; } = "VOCAB_MEANING_PRESERVED";
    public string Message { get; set; } = string.Empty;
    public short QuestionNo { get; set; }
    public string Term { get; set; } = string.Empty;
    public string Base { get; set; } = string.Empty;
    public string Pos { get; set; } = string.Empty;
    public string ImportedMeaningBase { get; set; } = string.Empty;
    public string StoredMeaningBase { get; set; } = string.Empty;
}
