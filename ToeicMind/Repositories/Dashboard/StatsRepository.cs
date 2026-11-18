using Microsoft.EntityFrameworkCore;
using ToeicMind.Data;
using ToeicMind.DTOs.Dashboard.Response;
using ToeicMind.Models.Identity;

namespace ToeicMind.Repositories.Dashboard;

/// <summary>Truy vấn thống kê toàn hệ thống: số liệu tổng quan, hoạt động theo ngày, đề được làm nhiều, câu hỏi khó. Chỉ đọc; ngày tính theo UTC.</summary>
public class StatsRepository : IStatsRepository
{
    private readonly AppDbContext _db;
    public StatsRepository(AppDbContext db) => _db = db;

    public async Task<DashboardSummaryDto> GetSummaryAsync(DateTime nowUtc)
    {
        var d7 = nowUtc.AddDays(-7);
        var d30 = nowUtc.AddDays(-30);
        var users = _db.Users.AsNoTracking();
        var attempts = _db.Attempts.AsNoTracking().Where(a => !a.IsDeleted);
        var exams = _db.Exams.AsNoTracking().Where(e => !e.IsDeleted && !e.ExamSet.IsDeleted);
        var submitted = attempts.Where(a => a.Status == AttemptStatus.Submitted);

        // Điểm trung bình chỉ tính các lượt Luyện thi có điểm quy đổi; độ chính xác tính trên mọi lượt đã nộp. Tính ngay trong SQL.
        // Điểm ước tính của bài kiểm tra đầu vào (Scope PLACEMENT) không tính vào điểm trung bình của các bài thi.
        var avgScore = await submitted.Where(a => a.Mode == AttemptMode.Exam && a.Scope != AttemptScope.Placement && a.TotalScaled != null).AverageAsync(a => (double?)a.TotalScaled);
        var accuracy = await submitted.Where(a => a.TotalQuestions > 0 && a.CorrectCount != null)
            .AverageAsync(a => (double?)(100.0 * a.CorrectCount!.Value / a.TotalQuestions));

        // Mỗi nhóm số liệu đếm bằng một truy vấn tổng hợp (COUNT có điều kiện) thay cho nhiều truy vấn COUNT riêng lẻ.
        var userCounts = await users.GroupBy(_ => 1).Select(g => new UserCountsDto
        {
            Total = g.Count(),
            Learners = g.Count(u => u.Role == UserRole.LEARNER),
            Admins = g.Count(u => u.Role == UserRole.ADMIN),
            Locked = g.Count(u => u.Status == UserStatus.Locked),
            NewLast7Days = g.Count(u => u.CreatedAt >= d7),
            NewLast30Days = g.Count(u => u.CreatedAt >= d30)
        }).FirstOrDefaultAsync();
        var examCounts = await exams.GroupBy(_ => 1).Select(g => new
        {
            Total = g.Count(),
            Published = g.Count(e => e.Status == "PUBLISHED"),
            Draft = g.Count(e => e.Status == "DRAFT")
        }).FirstOrDefaultAsync();
        var attemptCounts = await attempts.GroupBy(_ => 1).Select(g => new AttemptCountsDto
        {
            Total = g.Count(),
            Submitted = g.Count(a => a.Status == AttemptStatus.Submitted),
            InProgress = g.Count(a => a.Status == AttemptStatus.InProgress),
            Abandoned = g.Count(a => a.Status == AttemptStatus.Abandoned),
            Last7Days = g.Count(a => a.StartedAt >= d7),
            Last30Days = g.Count(a => a.StartedAt >= d30)
        }).FirstOrDefaultAsync();

        return new DashboardSummaryDto
        {
            Users = userCounts ?? new(),
            Exams = new ExamCountsDto
            {
                Sets = await _db.ExamSets.CountAsync(s => !s.IsDeleted),
                Exams = examCounts?.Total ?? 0, Published = examCounts?.Published ?? 0, Draft = examCounts?.Draft ?? 0
            },
            Attempts = attemptCounts ?? new(),
            ActiveLearnersLast7Days = await attempts.Where(a => a.StartedAt >= d7).Select(a => a.UserId).Distinct().CountAsync(),
            AverageTotalScaled = avgScore is null ? null : Math.Round(avgScore.Value, 1),
            AverageAccuracyPercent = accuracy is null ? null : Math.Round(accuracy.Value, 1),
            NewReports = await _db.Reports.CountAsync(r => r.Status == ReportStatus.New)
        };
    }

    public async Task<List<ActivityPointDto>> GetActivityAsync(DateTime fromUtc)
    {
        var newUsers = await _db.Users.AsNoTracking().Where(u => u.CreatedAt >= fromUtc)
            .GroupBy(u => u.CreatedAt.Date).Select(g => new { Day = g.Key, Count = g.Count() }).ToListAsync();
        var attempts = await _db.Attempts.AsNoTracking().Where(a => !a.IsDeleted && a.StartedAt >= fromUtc)
            .GroupBy(a => a.StartedAt.Date)
            .Select(g => new { Day = g.Key, Count = g.Count(), Learners = g.Select(a => a.UserId).Distinct().Count() }).ToListAsync();
        var days = newUsers.Select(x => x.Day).Concat(attempts.Select(x => x.Day)).Distinct().Order().ToList();
        return days.Select(day => new ActivityPointDto
        {
            Date = DateOnly.FromDateTime(day),
            NewUsers = newUsers.FirstOrDefault(x => x.Day == day)?.Count ?? 0,
            Attempts = attempts.FirstOrDefault(x => x.Day == day)?.Count ?? 0,
            ActiveLearners = attempts.FirstOrDefault(x => x.Day == day)?.Learners ?? 0
        }).ToList();
    }

    public async Task<List<ExamStatDto>> GetExamStatsAsync(int limit)
    {
        var rows = await _db.Attempts.AsNoTracking().Where(a => !a.IsDeleted && a.ExamId != null)
            .GroupBy(a => a.ExamId!.Value)
            .Select(g => new
            {
                ExamId = g.Key, Attempts = g.Count(),
                Submitted = g.Count(a => a.Status == AttemptStatus.Submitted)
            }).OrderByDescending(x => x.Attempts).Take(limit).ToListAsync();
        var ids = rows.Select(r => r.ExamId).ToList();
        var exams = await _db.Exams.AsNoTracking().Where(e => ids.Contains(e.ExamId)).Select(e => new { e.ExamId, e.ExamCode, e.Title }).ToListAsync();
        var scored = await _db.Attempts.AsNoTracking()
            .Where(a => !a.IsDeleted && a.ExamId != null && ids.Contains(a.ExamId.Value) && a.Status == AttemptStatus.Submitted)
            .Select(a => new { ExamId = a.ExamId!.Value, a.Mode, a.TotalQuestions, a.CorrectCount, a.TotalScaled }).ToListAsync();
        return rows.Select(r =>
        {
            var exam = exams.FirstOrDefault(e => e.ExamId == r.ExamId);
            var done = scored.Where(s => s.ExamId == r.ExamId).ToList();
            var percents = done.Where(s => s.TotalQuestions > 0 && s.CorrectCount != null).Select(s => 100.0 * s.CorrectCount!.Value / s.TotalQuestions).ToList();
            var scores = done.Where(s => s.Mode == AttemptMode.Exam && s.TotalScaled != null).Select(s => (double)s.TotalScaled!.Value).ToList();
            return new ExamStatDto
            {
                ExamId = r.ExamId, ExamCode = exam?.ExamCode ?? string.Empty, Title = exam?.Title ?? string.Empty,
                Attempts = r.Attempts, SubmittedAttempts = r.Submitted,
                AverageCorrectPercent = percents.Count == 0 ? null : Math.Round(percents.Average(), 1),
                AverageTotalScaled = scores.Count == 0 ? null : Math.Round(scores.Average(), 1)
            };
        }).ToList();
    }

    public async Task<List<QuestionStatDto>> GetHardestQuestionsAsync(int limit, int minAnswers)
    {
        // Chỉ tính đáp án của lượt đã nộp (Luyện thi đã chấm khi nộp, Luyện tập đã chấm từng câu).
        var answers = _db.AttemptAnswers.AsNoTracking().Where(a => a.SelectedOptionId != null && a.IsCorrect != null &&
            _db.Attempts.Any(t => t.AttemptId == a.AttemptId && !t.IsDeleted && t.Status == AttemptStatus.Submitted));
        var top = await answers.GroupBy(a => a.QuestionId)
            .Select(g => new { QuestionId = g.Key, Answers = g.Count(), Wrong = g.Count(a => a.IsCorrect == false) })
            .Where(x => x.Answers >= minAnswers).OrderByDescending(x => x.Wrong * 1.0 / x.Answers).ThenByDescending(x => x.Answers)
            .Take(limit).ToListAsync();
        var ids = top.Select(t => t.QuestionId).ToList();
        var questions = await _db.Questions.AsNoTracking().Where(q => ids.Contains(q.QuestionId))
            .Select(q => new { q.QuestionId, q.ExamId, q.QuestionNo, q.Group.PartNo, ExamCode = q.Group.Exam.ExamCode }).ToListAsync();
        return top.Select(t =>
        {
            var q = questions.FirstOrDefault(x => x.QuestionId == t.QuestionId);
            return new QuestionStatDto
            {
                QuestionId = t.QuestionId, ExamId = q?.ExamId ?? 0, ExamCode = q?.ExamCode ?? string.Empty, PartNo = q?.PartNo ?? 0,
                QuestionNo = q?.QuestionNo ?? 0, Answers = t.Answers, WrongAnswers = t.Wrong, WrongPercent = Math.Round(100.0 * t.Wrong / t.Answers, 1)
            };
        }).ToList();
    }
}
