using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using ToeicMind.Data;
using ToeicMind.Models.Exams;
using ToeicMind.Models.Learning;

namespace ToeicMind.Repositories.Learning;

/// <summary>Truy cập dữ liệu học từ vựng. Danh mục (từ, đề, liên kết từ–đề–Part) đọc phẳng một lần rồi do service cache; tiến độ ghi bằng UPDATE/INSERT một dòng.</summary>
public class VocabLearningRepository : IVocabLearningRepository
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    public VocabLearningRepository(AppDbContext db, IConfiguration config) { _db = db; _config = config; }

    public Task<List<VocabWordRow>> GetWordsAsync() =>
        _db.Vocabularies.AsNoTracking().Where(v => !v.IsDeleted)
            .Select(v => new VocabWordRow(v.VocabId, v.Lemma, v.PosCode, v.IpaUs, v.IpaUk, v.CefrLevel, v.MeaningVi, v.DefinitionEn)).ToListAsync();

    // Đề chưa xóa; chỉ đề PUBLISHED nếu bật Learning:StudyContentOnlyPublished (mặc định tắt, giống Nghe chép).
    public Task<List<VocabExamRow>> GetLiveExamsAsync()
    {
        var exams = _db.Exams.AsNoTracking().Where(e => !e.IsDeleted && !e.ExamSet.IsDeleted);
        if (_config.GetValue<bool>("Learning:StudyContentOnlyPublished")) exams = exams.Where(e => e.Status == "PUBLISHED");
        return exams.Select(e => new VocabExamRow(e.ExamId, e.ExamSetId, e.ExamCode, e.Title, e.ExamSet.Name, e.ExamSet.VocabAccess == Access.Vip)).ToListAsync();
    }

    public async Task<List<VocabLinkRow>> GetLinksAsync()
    {
        // Từ gắn với câu hỏi: Part lấy từ nhóm câu hỏi của câu đó.
        var byQuestion = await (from c in _db.VocabularyContexts.AsNoTracking()
                                where !c.IsDeleted && c.QuestionId != null
                                join q in _db.Questions.AsNoTracking() on c.QuestionId equals q.QuestionId
                                where !q.IsDeleted
                                join g in _db.QuestionGroups.AsNoTracking() on q.GroupId equals g.GroupId
                                where !g.IsDeleted
                                select new VocabLinkRow(c.VocabId, q.ExamId, g.PartNo)).Distinct().ToListAsync();
        // Từ gắn với clip nghe: đề và Part lấy từ nhóm của bộ clip.
        var byClip = await (from c in _db.VocabularyContexts.AsNoTracking()
                            where !c.IsDeleted && c.ClipId != null
                            join clip in _db.ListeningClips.AsNoTracking() on c.ClipId equals clip.ClipId
                            where !clip.IsDeleted
                            join item in _db.ListeningItems.AsNoTracking() on clip.ItemId equals item.ItemId
                            where !item.IsDeleted && item.GroupId != null
                            join g in _db.QuestionGroups.AsNoTracking() on item.GroupId equals g.GroupId
                            where !g.IsDeleted
                            select new VocabLinkRow(c.VocabId, g.ExamId, g.PartNo)).Distinct().ToListAsync();
        return byQuestion.Concat(byClip).Distinct().ToList();
    }

    public async Task<List<VocabContextRow>> GetContextsAsync(IReadOnlyCollection<int> vocabIds)
    {
        var ids = vocabIds.Distinct().ToList();
        if (ids.Count == 0) return [];
        return await _db.VocabularyContexts.AsNoTracking()
            .Where(c => ids.Contains(c.VocabId) && !c.IsDeleted && (c.ExampleEn != null || c.ContextMeaningVi != null))
            .OrderBy(c => c.VocabId).ThenBy(c => c.ContextId)
            .Select(c => new VocabContextRow(c.VocabId, c.SurfaceForm, c.ContextMeaningVi, c.ExampleEn, c.ExampleVi)).ToListAsync();
    }

    public async Task<HashSet<int>> GetMineIdsAsync(int userId) =>
        (await _db.UserVocabularies.AsNoTracking().Where(u => u.UserId == userId && u.VocabId != null)
            .Select(u => u.VocabId!.Value).ToListAsync()).ToHashSet();

    public Task<List<UserVocabProgress>> GetProgressAsync(int userId) =>
        _db.UserVocabProgress.AsNoTracking().Where(p => p.UserId == userId).ToListAsync();

    public Task<UserVocabProgress?> GetOneProgressAsync(int userId, int vocabId) =>
        _db.UserVocabProgress.AsNoTracking().FirstOrDefaultAsync(p => p.UserId == userId && p.VocabId == vocabId);

    public async Task SaveProgressAsync(UserVocabProgress next, bool exists)
    {
        if (!exists)
        {
            try
            {
                _db.UserVocabProgress.Add(next);
                await _db.SaveChangesAsync();
                return;
            }
            catch (DbUpdateException ex) when (IsDuplicateKey(ex))
            {
                // Request khác vừa tạo dòng này: ghi đè bằng trạng thái mới.
                _db.ChangeTracker.Clear();
            }
            finally { _db.ChangeTracker.Clear(); }
        }
        await _db.UserVocabProgress.Where(p => p.UserId == next.UserId && p.VocabId == next.VocabId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(p => p.Status, next.Status)
                .SetProperty(p => p.Repetitions, next.Repetitions)
                .SetProperty(p => p.IntervalDays, next.IntervalDays)
                .SetProperty(p => p.EaseFactor, next.EaseFactor)
                .SetProperty(p => p.Lapses, next.Lapses)
                .SetProperty(p => p.TotalReviews, next.TotalReviews)
                .SetProperty(p => p.CorrectReviews, next.CorrectReviews)
                .SetProperty(p => p.LastGrade, next.LastGrade)
                .SetProperty(p => p.LastReviewedAt, next.LastReviewedAt)
                .SetProperty(p => p.NextReviewAt, next.NextReviewAt));
    }

    public async Task<bool> ResetProgressAsync(int userId, int vocabId) =>
        await _db.UserVocabProgress.Where(p => p.UserId == userId && p.VocabId == vocabId).ExecuteDeleteAsync() > 0;

    public async Task TouchStudyDayAsync(int userId, DateOnly date, int reviews)
    {
        var updated = await _db.StudyDays.Where(d => d.UserId == userId && d.StudyDate == date)
            .ExecuteUpdateAsync(s => s.SetProperty(d => d.VocabReviewCount, d => d.VocabReviewCount + reviews));
        if (updated > 0) return;
        try
        {
            _db.StudyDays.Add(new StudyDay { UserId = userId, StudyDate = date, VocabReviewCount = reviews });
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (IsDuplicateKey(ex))
        {
            _db.ChangeTracker.Clear();
            await _db.StudyDays.Where(d => d.UserId == userId && d.StudyDate == date)
                .ExecuteUpdateAsync(s => s.SetProperty(d => d.VocabReviewCount, d => d.VocabReviewCount + reviews));
        }
        finally { _db.ChangeTracker.Clear(); }
    }

    public Task<int> GetReviewedOnAsync(int userId, DateOnly date) =>
        _db.StudyDays.AsNoTracking().Where(d => d.UserId == userId && d.StudyDate == date).Select(d => d.VocabReviewCount).FirstOrDefaultAsync();

    private static bool IsDuplicateKey(Exception ex) =>
        ex.InnerException is SqlException { Number: 2601 or 2627 } || ex is SqlException { Number: 2601 or 2627 };
}
