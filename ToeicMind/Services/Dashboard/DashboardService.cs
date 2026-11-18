using ToeicMind.DTOs.Dashboard.Request;
using ToeicMind.DTOs.Dashboard.Response;
using ToeicMind.Repositories.Dashboard;
using ToeicMind.Repositories.Learning;
using ToeicMind.Services.Learning;

namespace ToeicMind.Services.Dashboard;

/// <summary>Nghiệp vụ thống kê cho Admin. Số liệu từng học viên dùng chung cách tính với trang của học viên để hai bên luôn khớp.</summary>
public class DashboardService : IDashboardService
{
    private readonly IStatsRepository _stats;
    private readonly IProgressRepository _progress;
    private readonly IConfiguration _config;

    public DashboardService(IStatsRepository stats, IProgressRepository progress, IConfiguration config)
    {
        _stats = stats;
        _progress = progress;
        _config = config;
    }

    // Mọi số liệu của trang tổng quan trong một lần gọi (cùng một DbContext nên chạy tuần tự).
    public async Task<AdminDashboardDto> GetAsync(AdminDashboardRequestDto query) => new()
    {
        Summary = await _stats.GetSummaryAsync(DateTime.UtcNow),
        Activity = await GetActivityAsync(query.Days),
        PopularExams = await _stats.GetExamStatsAsync(query.Limit),
        HardestQuestions = await _stats.GetHardestQuestionsAsync(query.Limit, query.MinAnswers)
    };

    // Trả đủ từng ngày trong khoảng (ngày không có hoạt động = 0) để vẽ biểu đồ liền mạch.
    private async Task<List<ActivityPointDto>> GetActivityAsync(int days)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var from = today.AddDays(-(days - 1));
        var points = (await _stats.GetActivityAsync(from.ToDateTime(TimeOnly.MinValue))).ToDictionary(p => p.Date);
        return Enumerable.Range(0, days).Select(i => from.AddDays(i))
            .Select(day => points.TryGetValue(day, out var p) ? p : new ActivityPointDto { Date = day }).ToList();
    }

    public async Task<LearnerStatsDto> GetLearnerStatsAsync(int userId)
    {
        var totals = await _progress.GetTotalsAsync(userId);
        var studyDays = await _progress.GetStudyDaysAsync(userId);
        var (current, _, _) = LearnerService.Streaks(studyDays.Select(d => d.Date).ToList(), _config.StudyToday());
        return new LearnerStatsDto
        {
            UserId = userId, TotalAttempts = totals.TotalAttempts, SubmittedAttempts = totals.SubmittedAttempts,
            AbandonedAttempts = totals.AbandonedAttempts, AnsweredQuestions = totals.AnsweredQuestions, AccuracyPercent = totals.AccuracyPercent,
            BestTotalScaled = totals.BestTotalScaled, LastStudyDate = studyDays.Count == 0 ? null : studyDays[^1].Date, CurrentStreak = current,
            SavedWordCount = totals.SavedWords, ReportCount = totals.ReportCount, Parts = await _progress.GetPartProgressAsync(userId)
        };
    }
}
