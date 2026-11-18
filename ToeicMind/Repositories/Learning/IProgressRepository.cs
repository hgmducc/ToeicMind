using ToeicMind.Models.Catalogs;

namespace ToeicMind.Repositories.Learning;

/// <summary>Hợp đồng truy cập dữ liệu tiến độ học: tiến độ theo Part, ngân hàng câu hỏi, ngày học, điểm, tổng hợp người học (xem ProgressRepository).</summary>
public interface IProgressRepository
{
    Task<List<PartProgressDto>> GetPartProgressAsync(int userId);
    // Mọi câu hợp lệ của một Part kèm tiến độ của người học (cột phẳng, đủ để dựng thẻ Level/chủ điểm trong bộ nhớ). userId null = khách, chưa có tiến độ.
    Task<List<BankQuestionRow>> GetBankQuestionsAsync(int? userId, byte partNo);
    // 15 chủ điểm ngữ pháp của Part 5 (mỗi chủ điểm ứng với một phân loại lá).
    Task<List<GrammarTopic>> GetGrammarTopicsAsync();
    // Trả tổng số câu trong phạm vi, danh sách nhóm đã chọn (trộn ngẫu nhiên, đủ ~batch câu, luôn trọn nhóm) và số câu ứng viên bị loại vì là nội dung VIP (khi includeVip = false).
    Task<(int TotalInScope, List<int> GroupIds, int VipBlocked)> PickBankGroupsAsync(int userId, BankScope scope, string pick, int batchQuestions, bool includeVip);
    Task<int> ResetBankAsync(int userId, BankScope scope);
    // Mọi ngày học của người dùng (tăng dần theo ngày) kèm số lượt làm trong ngày.
    Task<List<StudyDayDto>> GetStudyDaysAsync(int userId);
    Task<List<ScorePointDto>> GetScorePointsAsync(int userId, int limit);
    // Mọi câu hợp lệ của 7 Part kèm tiến độ của người học (phân tích cá nhân hóa, CHG-007).
    Task<List<LearnerQuestionRow>> GetLearnerQuestionsAsync(int userId);
    Task<LearnerTotals> GetTotalsAsync(int userId);
}
