using ToeicMind.DTOs.Dashboard.Response;

namespace ToeicMind.Repositories.Dashboard;

/// <summary>Hợp đồng truy vấn thống kê toàn hệ thống cho Admin (xem StatsRepository).</summary>
public interface IStatsRepository
{
    Task<DashboardSummaryDto> GetSummaryAsync(DateTime nowUtc);
    Task<List<ActivityPointDto>> GetActivityAsync(DateTime fromUtc);
    Task<List<ExamStatDto>> GetExamStatsAsync(int limit);
    Task<List<QuestionStatDto>> GetHardestQuestionsAsync(int limit, int minAnswers);
}
