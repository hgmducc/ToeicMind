namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Một từ trong bộ từ cá nhân.</summary>
public class UserVocabularyDto
{
    public int UserVocabId { get; set; }
    public int? VocabId { get; set; }
    public string Word { get; set; } = string.Empty;
    public string? Meaning { get; set; }
    public string? Example { get; set; }
    public string? Pos { get; set; }
    public string? Cefr { get; set; }
    public string? Ipa { get; set; }
    public int? SourceQuestionId { get; set; }
    public DateTime CreatedAt { get; set; }
}
