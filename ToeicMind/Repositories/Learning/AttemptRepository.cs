using ToeicMind.DTOs.Exams.Response;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using ToeicMind.Data;
using ToeicMind.Models.Catalogs;

namespace ToeicMind.Repositories.Learning;

/// <summary>Truy cập dữ liệu lượt làm bài: tạo lượt, lưu đáp án, chấm/chốt, lịch sử, tiến độ câu hỏi và ngày học.</summary>
public class AttemptRepository : IAttemptRepository
{
    private readonly AppDbContext _db;
    public AttemptRepository(AppDbContext db) => _db = db;

    public Task<List<ScopeQuestion>> GetScopeQuestionsAsync(int examId, IReadOnlyCollection<byte> partNos)
    {
        var parts = partNos.ToList();
        return _db.Questions.AsNoTracking()
            .Where(q => q.ExamId == examId && !q.IsDeleted && !q.Group.IsDeleted && parts.Contains(q.Group.PartNo))
            .OrderBy(q => q.QuestionNo)
            .Select(q => new ScopeQuestion(q.QuestionId, q.GroupId, q.Group.PartNo, q.QuestionNo)).ToListAsync();
    }

    public Task<List<ScopeQuestion>> GetQuestionsByGroupsAsync(IReadOnlyCollection<int> groupIds)
    {
        var ids = groupIds.ToList();
        return _db.Questions.AsNoTracking()
            .Where(q => ids.Contains(q.GroupId) && !q.IsDeleted && !q.Group.IsDeleted)
            .OrderBy(q => q.GroupId).ThenBy(q => q.QuestionNo)
            .Select(q => new ScopeQuestion(q.QuestionId, q.GroupId, q.Group.PartNo, q.QuestionNo)).ToListAsync();
    }

    public Task<List<PartSetting>> GetPartSettingsAsync() => _db.PartSettings.AsNoTracking().OrderBy(p => p.PartNo).ToListAsync();

    public async Task<Attempt> CreateAsync(Attempt attempt, IReadOnlyCollection<int> questionIds, int? placementTestId = null)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync();
        _db.Attempts.Add(attempt);
        await _db.SaveChangesAsync();
        _db.AttemptAnswers.AddRange(questionIds.Select(id => new AttemptAnswer { AttemptId = attempt.AttemptId, QuestionId = id }));
        if (placementTestId is { } testId) _db.PlacementAttempts.Add(new PlacementAttempt { AttemptId = attempt.AttemptId, PlacementTestId = testId });
        await _db.SaveChangesAsync();
        await transaction.CommitAsync();
        _db.ChangeTracker.Clear();
        return attempt;
    }

    public Task<Attempt?> GetOwnAsync(int attemptId, int userId) =>
        _db.Attempts.AsNoTracking().FirstOrDefaultAsync(a => a.AttemptId == attemptId && a.UserId == userId && !a.IsDeleted);

    public Task<Attempt?> GetAsync(int attemptId) =>
        _db.Attempts.AsNoTracking().FirstOrDefaultAsync(a => a.AttemptId == attemptId && !a.IsDeleted);

    // Lượt có đồng hồ còn IN_PROGRESS mà hạn chót (bắt đầu + giới hạn + thời gian xem hướng dẫn) đã trước mốc cutoff; cũ nhất trước.
    public Task<List<Attempt>> GetOverdueAsync(DateTime cutoff, int limit) =>
        _db.Attempts.AsNoTracking()
            .Where(a => a.Status == AttemptStatus.InProgress && !a.IsDeleted && a.TimeLimitSeconds != null &&
                        a.StartedAt.AddSeconds(a.TimeLimitSeconds.Value + a.DirectionSeconds) < cutoff)
            .OrderBy(a => a.StartedAt).Take(limit).ToListAsync();

    public Task<List<AnswerRow>> GetAnswerRowsAsync(int attemptId) =>
        _db.AttemptAnswers.AsNoTracking().Where(a => a.AttemptId == attemptId)
            .Join(_db.Questions, a => a.QuestionId, q => q.QuestionId, (a, q) => new { a, q })
            .OrderBy(x => x.q.Group.PartNo).ThenBy(x => x.q.QuestionNo)
            .Select(x => new AnswerRow(x.a.AttemptAnswerId, x.a.QuestionId, x.q.GroupId, x.q.Group.PartNo, x.q.QuestionNo,
                x.a.SelectedOptionId, x.a.IsCorrect,
                _db.QuestionOptions.Where(o => o.QuestionId == x.a.QuestionId && o.IsCorrect).Select(o => o.OptionId).FirstOrDefault()))
            .ToListAsync();

    public async Task<Dictionary<int, string>> GetOptionLabelsAsync(IReadOnlyCollection<int> optionIds)
    {
        var ids = optionIds.Distinct().ToList();
        if (ids.Count == 0) return [];
        return await _db.QuestionOptions.AsNoTracking().Where(o => ids.Contains(o.OptionId))
            .ToDictionaryAsync(o => o.OptionId, o => o.OptionLabel);
    }

    public async Task<string?> GetExamTitleAsync(int? examId) =>
        examId is null ? null : await _db.Exams.AsNoTracking().Where(e => e.ExamId == examId).Select(e => e.Title).FirstOrDefaultAsync();

    public async Task<Dictionary<int, string>> GetPlacementTitlesAsync(IReadOnlyCollection<int> attemptIds)
    {
        var ids = attemptIds.Distinct().ToList();
        if (ids.Count == 0) return [];
        return await _db.PlacementAttempts.AsNoTracking().Where(p => ids.Contains(p.AttemptId))
            .Join(_db.PlacementTests, p => p.PlacementTestId, t => t.PlacementTestId, (p, t) => new { p.AttemptId, t.Title })
            .ToDictionaryAsync(x => x.AttemptId, x => x.Title);
    }

    public async Task<AnswerTarget?> GetAnswerTargetAsync(int attemptId, int questionId, int? optionId)
    {
        var row = await _db.AttemptAnswers.AsNoTracking().Where(a => a.AttemptId == attemptId && a.QuestionId == questionId)
            .Select(a => new
            {
                a.AttemptAnswerId, a.SelectedOptionId, a.IsCorrect,
                CorrectOptionId = _db.QuestionOptions.Where(o => o.QuestionId == a.QuestionId && o.IsCorrect).Select(o => o.OptionId).FirstOrDefault()
            }).FirstOrDefaultAsync();
        if (row is null) return null;
        var belongs = optionId is null || await _db.QuestionOptions.AnyAsync(o => o.OptionId == optionId && o.QuestionId == questionId);
        return new AnswerTarget(row.AttemptAnswerId, row.SelectedOptionId, row.IsCorrect, row.CorrectOptionId, belongs);
    }

    public Task SaveAnswerAsync(long attemptAnswerId, int? optionId, bool? isCorrect, DateTime at)
    {
        DateTime? answeredAt = optionId is null ? null : at;
        return _db.AttemptAnswers.Where(a => a.AttemptAnswerId == attemptAnswerId)
            .ExecuteUpdateAsync(s => s.SetProperty(a => a.SelectedOptionId, optionId).SetProperty(a => a.IsCorrect, isCorrect)
                .SetProperty(a => a.AnsweredAt, answeredAt));
    }

    public async Task<FeedbackSource?> GetFeedbackAsync(int questionId)
    {
        var question = await _db.Questions.AsNoTracking().Where(q => q.QuestionId == questionId)
            .Select(q => new { q.Explanation, q.OptionExplanations, q.Group.TranscriptEn, q.Group.TranslationVi }).FirstOrDefaultAsync();
        if (question is null) return null;
        var vocabularies = await _db.VocabularyContexts.AsNoTracking()
            .Where(c => c.QuestionId == questionId && !c.IsDeleted && !c.Vocabulary.IsDeleted)
            .OrderBy(c => c.ContextId)
            .Select(c => new QuestionVocabularyDto
            {
                VocabId = c.VocabId, Term = c.SurfaceForm ?? c.Vocabulary.Lemma, Base = c.Vocabulary.Lemma, Pos = c.Vocabulary.PosCode,
                Ipa = c.Vocabulary.IpaUs, Cefr = c.Vocabulary.CefrLevel, MeaningBase = c.Vocabulary.MeaningVi,
                TermMeaningVi = c.ContextMeaningVi, DefinitionEn = c.Vocabulary.DefinitionEn, ExampleEn = c.ExampleEn, ExampleVi = c.ExampleVi
            }).ToListAsync();
        return new FeedbackSource(question.Explanation, question.OptionExplanations, question.TranscriptEn, question.TranslationVi, vocabularies);
    }

    public async Task<bool> AddDirectionSecondsAsync(int attemptId, int seconds) =>
        await _db.Attempts.Where(a => a.AttemptId == attemptId && a.Status == AttemptStatus.InProgress)
            .ExecuteUpdateAsync(s => s.SetProperty(a => a.DirectionSeconds, a => a.DirectionSeconds + seconds)) > 0;

    public Task<short?> GetScaledScoreAsync(string skill, int correctCount) =>
        _db.ScoreConversions.AsNoTracking().Where(s => s.Skill == skill && s.CorrectCount == correctCount)
            .Select(s => (short?)s.ScaledScore).FirstOrDefaultAsync();

    public async Task<bool> FinalizeAsync(int attemptId, GradedAttempt graded, IReadOnlyCollection<long> allAnswerIds)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync();
        // Điều kiện Status = IN_PROGRESS làm việc chốt là nguyên tử: nộp trùng hoặc hết giờ đồng thời chỉ một bên thắng.
        var changed = await _db.Attempts.Where(a => a.AttemptId == attemptId && a.Status == AttemptStatus.InProgress)
            .ExecuteUpdateAsync(s => s
                .SetProperty(a => a.Status, graded.Status)
                .SetProperty(a => a.SubmittedAt, graded.SubmittedAt)
                .SetProperty(a => a.IsAutoSubmitted, graded.IsAutoSubmitted)
                .SetProperty(a => a.DurationSeconds, graded.DurationSeconds)
                .SetProperty(a => a.CorrectCount, (short?)graded.CorrectCount)
                .SetProperty(a => a.ListeningScaled, graded.ListeningScaled)
                .SetProperty(a => a.ReadingScaled, graded.ReadingScaled)
                .SetProperty(a => a.TotalScaled, graded.TotalScaled));
        if (changed == 0) return false;
        var correct = graded.CorrectAnswerIds.ToList();
        var wrong = allAnswerIds.Except(correct).ToList();
        if (correct.Count > 0)
            await _db.AttemptAnswers.Where(a => a.AttemptId == attemptId && correct.Contains(a.AttemptAnswerId))
                .ExecuteUpdateAsync(s => s.SetProperty(a => a.IsCorrect, true));
        if (wrong.Count > 0)
            await _db.AttemptAnswers.Where(a => a.AttemptId == attemptId && wrong.Contains(a.AttemptAnswerId))
                .ExecuteUpdateAsync(s => s.SetProperty(a => a.IsCorrect, false));
        await transaction.CommitAsync();
        return true;
    }

    public async Task<bool> AbandonAsync(int attemptId, DateTime at) =>
        await _db.Attempts.Where(a => a.AttemptId == attemptId && a.Status == AttemptStatus.InProgress)
            .ExecuteUpdateAsync(s => s.SetProperty(a => a.Status, AttemptStatus.Abandoned).SetProperty(a => a.SubmittedAt, (DateTime?)at)) > 0;

    // Lượt đang làm phải bỏ dở hoặc nộp trước khi xóa.
    public async Task<bool> SoftDeleteAsync(int attemptId, int userId) =>
        await _db.Attempts.Where(a => a.AttemptId == attemptId && a.UserId == userId && !a.IsDeleted && a.Status != AttemptStatus.InProgress)
            .ExecuteUpdateAsync(s => s.SetProperty(a => a.IsDeleted, true).SetProperty(a => a.DeletedAt, (DateTime?)DateTime.UtcNow)) > 0;

    public async Task UpsertProgressAsync(int userId, IReadOnlyCollection<KeyValuePair<int, bool>> results, DateTime at)
    {
        if (results.Count == 0) return;
        var latest = results.GroupBy(r => r.Key).ToDictionary(g => g.Key, g => g.Last().Value);
        var ids = latest.Keys.ToList();
        var existing = (await _db.UserQuestionProgress.Where(p => p.UserId == userId && ids.Contains(p.QuestionId)).ToListAsync()).ToDictionary(p => p.QuestionId);
        foreach (var (questionId, isCorrect) in latest)
        {
            if (existing.TryGetValue(questionId, out var row)) { row.LastIsCorrect = isCorrect; row.LastAnsweredAt = at; }
            else _db.UserQuestionProgress.Add(new UserQuestionProgress { UserId = userId, QuestionId = questionId, LastIsCorrect = isCorrect, LastAnsweredAt = at });
        }
        try { await _db.SaveChangesAsync(); }
        catch (DbUpdateException ex) when (IsDuplicateKey(ex)) { /* request khác đã ghi cùng câu: bản ghi mới nhất vẫn đúng */ }
        finally { _db.ChangeTracker.Clear(); }
    }

    public async Task TouchStudyDayAsync(int userId, DateOnly date)
    {
        var updated = await _db.StudyDays.Where(d => d.UserId == userId && d.StudyDate == date)
            .ExecuteUpdateAsync(s => s.SetProperty(d => d.AttemptCount, d => (short)(d.AttemptCount + 1)));
        if (updated > 0) return;
        try
        {
            _db.StudyDays.Add(new StudyDay { UserId = userId, StudyDate = date, AttemptCount = 1 });
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (IsDuplicateKey(ex))
        {
            _db.ChangeTracker.Clear();
            await _db.StudyDays.Where(d => d.UserId == userId && d.StudyDate == date)
                .ExecuteUpdateAsync(s => s.SetProperty(d => d.AttemptCount, d => (short)(d.AttemptCount + 1)));
        }
        finally { _db.ChangeTracker.Clear(); }
    }

    public async Task<(List<AttemptSummaryDto> Items, int TotalCount)> ListAsync(int userId, AttemptListRequestDto query)
    {
        var attempts = _db.Attempts.AsNoTracking().Where(a => a.UserId == userId && !a.IsDeleted);
        if (query.Mode is not null) attempts = attempts.Where(a => a.Mode == query.Mode);
        if (query.Scope is not null) attempts = attempts.Where(a => a.Scope == query.Scope);
        if (query.Status is not null) attempts = attempts.Where(a => a.Status == query.Status);
        var total = await attempts.CountAsync();
        var items = await attempts.OrderByDescending(a => a.StartedAt).ThenByDescending(a => a.AttemptId)
            .Skip((query.Page - 1) * query.PageSize).Take(query.PageSize)
            .Select(a => new AttemptSummaryDto
            {
                AttemptId = a.AttemptId, ExamId = a.ExamId,
                ExamTitle = _db.Exams.Where(e => e.ExamId == a.ExamId).Select(e => e.Title).FirstOrDefault(),
                Mode = a.Mode, Scope = a.Scope, Status = a.Status, StartedAt = a.StartedAt, SubmittedAt = a.SubmittedAt,
                DurationSeconds = a.DurationSeconds, TotalQuestions = a.TotalQuestions, CorrectCount = a.CorrectCount,
                ListeningScaled = a.ListeningScaled, ReadingScaled = a.ReadingScaled, TotalScaled = a.TotalScaled
            }).ToListAsync();
        // Lượt kiểm tra đầu vào không thuộc đề: lấy tên bài kiểm tra bằng truy vấn riêng, chỉ khi trang có lượt loại này.
        var placement = items.Where(i => i.Scope == AttemptScope.Placement).Select(i => i.AttemptId).ToList();
        if (placement.Count > 0)
        {
            var titles = await GetPlacementTitlesAsync(placement);
            foreach (var item in items.Where(i => i.Scope == AttemptScope.Placement))
                item.ExamTitle = titles.GetValueOrDefault(item.AttemptId) ?? "Kiểm tra đầu vào";
        }
        return (items, total);
    }

    private static bool IsDuplicateKey(Exception ex) =>
        ex.InnerException is SqlException { Number: 2601 or 2627 } || ex is SqlException { Number: 2601 or 2627 };
}
