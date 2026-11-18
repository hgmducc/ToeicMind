using ToeicMind.Models.Catalogs;

namespace ToeicMind.Repositories.Learning;

/// <summary>Hợp đồng truy cập dữ liệu lượt làm bài (xem AttemptRepository).</summary>
public interface IAttemptRepository
{
    Task<List<ScopeQuestion>> GetScopeQuestionsAsync(int examId, IReadOnlyCollection<byte> partNos);
    Task<List<ScopeQuestion>> GetQuestionsByGroupsAsync(IReadOnlyCollection<int> groupIds);
    Task<List<PartSetting>> GetPartSettingsAsync();
    // placementTestId: lượt kiểm tra đầu vào, ghi kèm dòng PlacementAttempt trong cùng giao dịch.
    Task<Attempt> CreateAsync(Attempt attempt, IReadOnlyCollection<int> questionIds, int? placementTestId = null);

    // Lượt làm của đúng người dùng (không thuộc người khác, chưa xóa). Trả bản chỉ đọc.
    Task<Attempt?> GetOwnAsync(int attemptId, int userId);
    Task<Attempt?> GetAsync(int attemptId);
    Task<List<Attempt>> GetOverdueAsync(DateTime cutoff, int limit);
    Task<List<AnswerRow>> GetAnswerRowsAsync(int attemptId);
    // Nhãn (A/B/C/D) của các phương án; dùng cho bảng đáp án ở trang kết quả.
    Task<Dictionary<int, string>> GetOptionLabelsAsync(IReadOnlyCollection<int> optionIds);
    Task<string?> GetExamTitleAsync(int? examId);
    // Tên bài kiểm tra đầu vào của các lượt PLACEMENT (AttemptId → Title). Chỉ gọi khi có lượt PLACEMENT để chức năng cũ không phụ thuộc bảng CHG-007.
    Task<Dictionary<int, string>> GetPlacementTitlesAsync(IReadOnlyCollection<int> attemptIds);

    Task<AnswerTarget?> GetAnswerTargetAsync(int attemptId, int questionId, int? optionId);
    Task SaveAnswerAsync(long attemptAnswerId, int? optionId, bool? isCorrect, DateTime at);
    Task<FeedbackSource?> GetFeedbackAsync(int questionId);
    Task<bool> AddDirectionSecondsAsync(int attemptId, int seconds);

    Task<short?> GetScaledScoreAsync(string skill, int correctCount);
    // Chốt lượt làm nếu còn IN_PROGRESS. Trả false khi đã có request khác chốt trước (an toàn khi nộp trùng).
    Task<bool> FinalizeAsync(int attemptId, GradedAttempt graded, IReadOnlyCollection<long> allAnswerIds);
    Task<bool> AbandonAsync(int attemptId, DateTime at);
    Task<bool> SoftDeleteAsync(int attemptId, int userId);

    Task UpsertProgressAsync(int userId, IReadOnlyCollection<KeyValuePair<int, bool>> results, DateTime at);
    Task TouchStudyDayAsync(int userId, DateOnly date);

    Task<(List<AttemptSummaryDto> Items, int TotalCount)> ListAsync(int userId, AttemptListRequestDto query);
}
