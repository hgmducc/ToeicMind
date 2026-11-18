using ToeicMind.DTOs.Exams.Response;

namespace ToeicMind.DTOs.Learning.Response;

/// <summary>Đáp án đúng và giải thích, chỉ trả về khi Luyện tập hoặc học theo ngân hàng (chấm ngay).</summary>
public class AnswerFeedbackDto
{
    public bool IsCorrect { get; set; }
    public int CorrectOptionId { get; set; }
    public string? Explanation { get; set; }
    public string? OptionExplanations { get; set; }
    public string? TranscriptEn { get; set; }
    public string? TranslationVi { get; set; }
    public List<QuestionVocabularyDto> Vocabularies { get; set; } = [];
}
