namespace ToeicMind.Services.Learning;

/// <summary>Hợp đồng nghiệp vụ tiến độ học của người học: tổng quan, ngân hàng câu hỏi, ngữ pháp. userId null = khách (danh sách công khai, chưa có tiến độ).</summary>
public interface ILearnerService
{
    Task<LearnerDashboardDto> GetDashboardAsync(int userId, LearnerDashboardRequestDto query);
    Task<BankCardsDto> GetBankCardsAsync(int? userId, byte partNo, BankCardsRequestDto query);
    Task<GrammarTopicsDto> GetGrammarTopicsAsync(int? userId, int? parentCategoryId);
    Task<(AttemptDto? Result, string? Error)> StartBankAttemptAsync(int userId, StartBankAttemptRequestDto dto);
    Task<(int Cleared, string? Error)> ResetBankCardAsync(int userId, byte partNo, string cardKey);
}
