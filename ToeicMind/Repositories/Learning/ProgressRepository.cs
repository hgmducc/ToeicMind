using Microsoft.EntityFrameworkCore;
using ToeicMind.Models.Catalogs;
using ToeicMind.Models.Exams;
using System.Linq.Expressions;
using ToeicMind.Data;

namespace ToeicMind.Repositories.Learning;

/// <summary>Truy cập dữ liệu tiến độ học. "Câu hợp lệ" = câu chưa xóa, thuộc đề đã xuất bản, chưa xóa, bộ đề chưa xóa.</summary>
public class ProgressRepository : IProgressRepository
{
    private readonly AppDbContext _db;
    public ProgressRepository(AppDbContext db) => _db = db;

    private IQueryable<Question> LiveQuestions() => _db.Questions.AsNoTracking()
        .Where(q => !q.IsDeleted && !q.Group.IsDeleted && q.Group.Exam.Status == "PUBLISHED" &&
                    !q.Group.Exam.IsDeleted && !q.Group.Exam.ExamSet.IsDeleted);

    // Câu thuộc bộ đề đặt quyền VIP cho kỹ năng của câu: Nghe (Part 1–4) theo ListeningAccess, Đọc (Part 5–7) theo ReadingAccess.
    private static readonly Expression<Func<Question, bool>> IsVipOnly = q =>
        (q.Group.PartNo <= 4 ? q.Group.Exam.ExamSet.ListeningAccess : q.Group.Exam.ExamSet.ReadingAccess) == Access.Vip;

    public async Task<List<PartProgressDto>> GetPartProgressAsync(int userId)
    {
        var totals = await LiveQuestions().GroupBy(q => q.Group.PartNo)
            .Select(g => new { PartNo = g.Key, Total = g.Count() }).ToListAsync();
        var done = await (from p in _db.UserQuestionProgress.AsNoTracking().Where(p => p.UserId == userId)
                          join q in LiveQuestions() on p.QuestionId equals q.QuestionId
                          group p by q.Group.PartNo into g
                          select new { PartNo = g.Key, Practiced = g.Count(), Correct = g.Count(x => x.LastIsCorrect) }).ToListAsync();
        var names = (await _db.PartSettings.AsNoTracking().ToListAsync()).ToDictionary(p => p.PartNo, p => p.PartName);
        return Enumerable.Range(1, 7).Select(n => (byte)n).Select(partNo =>
        {
            var total = totals.FirstOrDefault(t => t.PartNo == partNo)?.Total ?? 0;
            var d = done.FirstOrDefault(x => x.PartNo == partNo);
            return new PartProgressDto
            {
                PartNo = partNo, PartName = names.GetValueOrDefault(partNo) ?? $"Part {partNo}", TotalQuestions = total,
                PracticedCount = d?.Practiced ?? 0, CorrectCount = d?.Correct ?? 0, WrongCount = (d?.Practiced ?? 0) - (d?.Correct ?? 0)
            };
        }).ToList();
    }

    // userId null = khách: không khớp dòng tiến độ nào nên mọi câu đều "chưa luyện".
    public Task<List<BankQuestionRow>> GetBankQuestionsAsync(int? userId, byte partNo)
    {
        var live = LiveQuestions().Where(q => q.Group.PartNo == partNo);
        var progress = _db.UserQuestionProgress.AsNoTracking().Where(p => p.UserId == userId);
        return (from q in live
                join p in progress on q.QuestionId equals p.QuestionId into pj
                from p in pj.DefaultIfEmpty()
                select new BankQuestionRow(q.QuestionId, q.GroupId, q.Group.CategoryId, q.LevelNo, p != null, p == null ? (bool?)null : p.LastIsCorrect,
                    (q.Group.PartNo <= 4 ? q.Group.Exam.ExamSet.ListeningAccess : q.Group.Exam.ExamSet.ReadingAccess) == Access.Vip)).ToListAsync();
    }

    public Task<List<GrammarTopic>> GetGrammarTopicsAsync() =>
        _db.GrammarTopics.AsNoTracking().OrderBy(t => t.SortOrder).ThenBy(t => t.GrammarTopicId).ToListAsync();

    public async Task<(int TotalInScope, List<int> GroupIds, int VipBlocked)> PickBankGroupsAsync(int userId, BankScope scope, string pick, int batchQuestions, bool includeVip)
    {
        var card = Scoped(scope);
        var total = await card.CountAsync();
        if (total == 0) return (0, [], 0);
        var candidates = card;
        if (pick == "NEW") candidates = candidates.Where(q => !_db.UserQuestionProgress.Any(p => p.UserId == userId && p.QuestionId == q.QuestionId));
        else if (pick == "WRONG") candidates = candidates.Where(q => _db.UserQuestionProgress.Any(p => p.UserId == userId && p.QuestionId == q.QuestionId && !p.LastIsCorrect));
        // Người chưa có VIP chỉ được chọn câu thuộc bộ đề miễn phí; VipBlocked = số câu bị loại để service báo VIP_REQUIRED thay vì "hết câu".
        var blocked = 0;
        if (!includeVip)
        {
            blocked = await candidates.CountAsync(IsVipOnly);
            candidates = candidates.Where(Not(IsVipOnly));
        }
        var rows = await candidates.Select(q => q.GroupId).ToListAsync();
        // Mỗi nhóm một lần, theo số câu ứng viên của nhóm; trộn ngẫu nhiên rồi lấy đủ ~batch câu (luôn trọn nhóm).
        var groups = rows.GroupBy(g => g).Select(g => (GroupId: g.Key, Count: g.Count())).OrderBy(_ => Random.Shared.Next()).ToList();
        var picked = new List<int>();
        var count = 0;
        foreach (var (groupId, groupCount) in groups)
        {
            if (count >= batchQuestions) break;
            picked.Add(groupId);
            count += groupCount;
        }
        return (total, picked, blocked);
    }

    private static Expression<Func<Question, bool>> Not(Expression<Func<Question, bool>> predicate) =>
        Expression.Lambda<Func<Question, bool>>(Expression.Not(predicate.Body), predicate.Parameters);

    public Task<int> ResetBankAsync(int userId, BankScope scope)
    {
        var card = Scoped(scope);
        return _db.UserQuestionProgress.Where(p => p.UserId == userId && card.Any(q => q.QuestionId == p.QuestionId)).ExecuteDeleteAsync();
    }

    private IQueryable<Question> Scoped(BankScope scope)
    {
        var questions = LiveQuestions().Where(q => q.Group.PartNo == scope.PartNo);
        if (scope.LevelNo is { } level) questions = questions.Where(q => q.LevelNo == level);
        if (scope.CategoryIds is { } categoryIds) questions = questions.Where(q => categoryIds.Contains(q.Group.CategoryId));
        return questions;
    }

    public Task<List<StudyDayDto>> GetStudyDaysAsync(int userId) =>
        _db.StudyDays.AsNoTracking().Where(d => d.UserId == userId)
            .OrderBy(d => d.StudyDate).Select(d => new StudyDayDto { Date = d.StudyDate, AttemptCount = d.AttemptCount }).ToListAsync();

    // Gồm cả điểm ước tính của bài kiểm tra đầu vào (Scope = PLACEMENT, tên lấy riêng khi có) để thấy điểm xuất phát trên đường điểm.
    public async Task<List<ScorePointDto>> GetScorePointsAsync(int userId, int limit)
    {
        var points = await _db.Attempts.AsNoTracking()
            .Where(a => a.UserId == userId && !a.IsDeleted && a.Status == AttemptStatus.Submitted && a.Mode == AttemptMode.Exam && a.TotalScaled != null)
            .OrderByDescending(a => a.SubmittedAt).Take(limit)
            .Select(a => new ScorePointDto
            {
                AttemptId = a.AttemptId, ExamTitle = _db.Exams.Where(e => e.ExamId == a.ExamId).Select(e => e.Title).FirstOrDefault(), Scope = a.Scope,
                SubmittedAt = a.SubmittedAt!.Value, ListeningScaled = a.ListeningScaled, ReadingScaled = a.ReadingScaled, TotalScaled = a.TotalScaled
            }).ToListAsync();
        var placement = points.Where(p => p.Scope == AttemptScope.Placement).Select(p => p.AttemptId).ToList();
        if (placement.Count > 0)
        {
            var titles = await _db.PlacementAttempts.AsNoTracking().Where(p => placement.Contains(p.AttemptId))
                .Join(_db.PlacementTests, p => p.PlacementTestId, t => t.PlacementTestId, (p, t) => new { p.AttemptId, t.Title })
                .ToDictionaryAsync(x => x.AttemptId, x => x.Title);
            foreach (var point in points.Where(p => p.Scope == AttemptScope.Placement))
                point.ExamTitle = titles.GetValueOrDefault(point.AttemptId) ?? "Kiểm tra đầu vào";
        }
        return points;
    }

    // Mọi câu hợp lệ của 7 Part kèm tiến độ của người học (một truy vấn phẳng), dùng để phân tích điểm mạnh/yếu theo Part, Level và chủ điểm.
    public Task<List<LearnerQuestionRow>> GetLearnerQuestionsAsync(int userId)
    {
        var progress = _db.UserQuestionProgress.AsNoTracking().Where(p => p.UserId == userId);
        return (from q in LiveQuestions()
                join p in progress on q.QuestionId equals p.QuestionId into pj
                from p in pj.DefaultIfEmpty()
                select new LearnerQuestionRow(q.QuestionId, q.Group.PartNo, q.Group.CategoryId, q.LevelNo, p != null, p == null ? (bool?)null : p.LastIsCorrect,
                    (q.Group.PartNo <= 4 ? q.Group.Exam.ExamSet.ListeningAccess : q.Group.Exam.ExamSet.ReadingAccess) == Access.Vip)).ToListAsync();
    }

    public async Task<LearnerTotals> GetTotalsAsync(int userId)
    {
        var attempts = _db.Attempts.AsNoTracking().Where(a => a.UserId == userId && !a.IsDeleted);
        var byStatus = await attempts.GroupBy(a => a.Status).Select(g => new { Status = g.Key, Count = g.Count() }).ToListAsync();
        var submitted = _db.AttemptAnswers.AsNoTracking().Where(a => a.SelectedOptionId != null &&
            _db.Attempts.Any(t => t.AttemptId == a.AttemptId && t.UserId == userId && !t.IsDeleted && t.Status == AttemptStatus.Submitted));
        var answered = await submitted.CountAsync();
        var correct = await submitted.CountAsync(a => a.IsCorrect == true);
        // Điểm cao nhất/gần nhất là điểm bài thi thật; điểm ước tính của kiểm tra đầu vào chỉ hiện trên đường điểm.
        var scored = attempts.Where(a => a.Status == AttemptStatus.Submitted && a.Mode == AttemptMode.Exam && a.Scope != AttemptScope.Placement && a.TotalScaled != null);
        var best = await scored.OrderByDescending(a => a.TotalScaled).Select(a => (int?)a.TotalScaled).FirstOrDefaultAsync();
        var last = await scored.OrderByDescending(a => a.SubmittedAt).Select(a => (int?)a.TotalScaled).FirstOrDefaultAsync();
        return new LearnerTotals(byStatus.Sum(s => s.Count), byStatus.Where(s => s.Status == AttemptStatus.Submitted).Sum(s => s.Count),
            byStatus.Where(s => s.Status == AttemptStatus.Abandoned).Sum(s => s.Count), answered, correct, best, last,
            await _db.UserVocabularies.CountAsync(v => v.UserId == userId), await _db.Reports.CountAsync(r => r.ReporterId == userId));
    }
}
