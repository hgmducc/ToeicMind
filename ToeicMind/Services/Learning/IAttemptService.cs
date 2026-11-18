namespace ToeicMind.Services.Learning;

/// <summary>Hợp đồng nghiệp vụ làm bài của người học (xem AttemptService). Mọi thao tác chỉ trên lượt làm của chính người dùng.</summary>
public interface IAttemptService
{
    Task<(AttemptDto? Result, string? Error)> StartAsync(int userId, StartAttemptRequestDto dto);
    Task<(AttemptDto? Result, string? Error)> StartBankAsync(int userId, IReadOnlyCollection<int> groupIds);
    // Lượt kiểm tra đầu vào (EXAM, Scope PLACEMENT) trên các nhóm theo thứ tự Admin sắp.
    Task<(AttemptDto? Result, string? Error)> StartPlacementAsync(int userId, int placementTestId, IReadOnlyList<int> orderedGroupIds, int timeLimitSeconds);
    Task<(AttemptDto? Result, string? Error)> GetAsync(int userId, int attemptId);
    // reveal: chỉ có tác dụng ở Luyện tập/ngân hàng (xem SaveAnswerRequestDto.Reveal).
    Task<(AnswerResultDto? Result, string? Error)> SaveAnswerAsync(int userId, int attemptId, int questionId, int? optionId, bool reveal = true);
    Task<string?> AddDirectionTimeAsync(int userId, int attemptId, int seconds);
    Task<(AttemptResultDto? Result, string? Error)> SubmitAsync(int userId, int attemptId);
    Task<string?> AbandonAsync(int userId, int attemptId);
    Task<(AttemptResultDto? Result, string? Error)> GetResultAsync(int userId, int attemptId, bool includeReview);
    Task<AttemptPageDto> ListAsync(int userId, AttemptListRequestDto query);
    Task<string?> DeleteAsync(int userId, int attemptId);
    // Tác vụ nền (AttemptAutoSubmitWorker): tự nộp tối đa limit lượt đã quá hạn chót; trả số lượt đã chốt.
    Task<int> AutoSubmitOverdueAsync(int limit);
}
