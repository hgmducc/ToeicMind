using ToeicMind.DTOs.Exams.Response;

namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Một câu khi xem lại: đáp án đã chọn, đáp án đúng, giải thích, từ vựng.</summary>
public class ReviewQuestionDto
{
    public int QuestionId { get; set; }
    public short QuestionNo { get; set; }
    public string? QuestionText { get; set; }
    public string? Explanation { get; set; }
    public string? OptionExplanations { get; set; }
    public int? SelectedOptionId { get; set; }
    public bool IsCorrect { get; set; }
    public List<QuestionOptionDto> Options { get; set; } = [];
    public List<QuestionVocabularyDto> Vocabularies { get; set; } = [];
}
