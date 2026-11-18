using ToeicMind.DTOs.Exams.Response;

namespace ToeicMind.Repositories.Learning;

/// <summary>Một câu hỏi thuộc phạm vi làm bài (để tạo lượt làm).</summary>
public record ScopeQuestion(int QuestionId, int GroupId, byte PartNo, short QuestionNo);

/// <summary>Một dòng đáp án của lượt làm kèm đáp án đúng, dùng để chấm điểm, dựng kết quả và xem lại.</summary>
public record AnswerRow(long AttemptAnswerId, int QuestionId, int GroupId, byte PartNo, short QuestionNo,
    int? SelectedOptionId, bool? IsCorrect, int CorrectOptionId);

/// <summary>Thông tin để lưu đáp án một câu: dòng đáp án hiện có, đáp án đúng và phương án chọn có thuộc câu này không.</summary>
public record AnswerTarget(long AttemptAnswerId, int? SelectedOptionId, bool? IsCorrect, int CorrectOptionId, bool OptionBelongsToQuestion);

/// <summary>Đáp án giải thích của một câu (Luyện tập / ngân hàng).</summary>
public record FeedbackSource(string? Explanation, string? OptionExplanations, string? TranscriptEn, string? TranslationVi,
    List<QuestionVocabularyDto> Vocabularies);

/// <summary>Kết quả chấm để chốt lượt làm.</summary>
public record GradedAttempt(string Status, DateTime SubmittedAt, bool IsAutoSubmitted, int DurationSeconds, short CorrectCount,
    short? ListeningScaled, short? ReadingScaled, short? TotalScaled, IReadOnlyCollection<long> CorrectAnswerIds);

/// <summary>Số liệu tổng hợp của một người học.</summary>
public record LearnerTotals(int TotalAttempts, int SubmittedAttempts, int AbandonedAttempts, int AnsweredQuestions, int CorrectAnswers,
    int? BestTotalScaled, int? LastTotalScaled, int SavedWords, int ReportCount)
{
    /// <summary>Tỷ lệ trả lời đúng (%), làm tròn một chữ số; 0 nếu chưa trả lời câu nào.</summary>
    public double AccuracyPercent => AnsweredQuestions == 0 ? 0 : Math.Round(100.0 * CorrectAnswers / AnsweredQuestions, 1);
}

/// <summary>Một câu hỏi của ngân hàng (câu hợp lệ của một Part) kèm tiến độ của người học: Practiced = đã luyện, LastCorrect = lần gần nhất đúng/sai (null nếu chưa luyện), VipOnly = bộ đề chứa câu đặt quyền Nghe (Part 1–4) hoặc Đọc (Part 5–7) là VIP.</summary>
public record BankQuestionRow(int QuestionId, int GroupId, int CategoryId, byte? LevelNo, bool Practiced, bool? LastCorrect, bool VipOnly);

/// <summary>Một câu hợp lệ (mọi Part) kèm tiến độ của người học, dùng cho phân tích cá nhân hóa: Part, phân loại lá, Level, đã luyện, lần gần nhất đúng/sai, nội dung VIP.</summary>
public record LearnerQuestionRow(int QuestionId, byte PartNo, int CategoryId, byte? LevelNo, bool Practiced, bool? LastCorrect, bool VipOnly);

/// <summary>Phạm vi câu hỏi của một thẻ ngân hàng trong một Part: lọc theo Level và/hoặc các phân loại (đã gồm loại con). Null = không lọc.</summary>
public record BankScope(byte PartNo, byte? LevelNo, IReadOnlyCollection<int>? CategoryIds);
