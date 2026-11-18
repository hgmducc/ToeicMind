using Microsoft.EntityFrameworkCore;
using ToeicMind.Data;

namespace ToeicMind.Repositories.Learning;

/// <summary>Truy cập bộ từ cá nhân: từ lấy từ hệ thống (VocabId) hoặc từ tự thêm (CustomWord).</summary>
public class UserVocabularyRepository : IUserVocabularyRepository
{
    private readonly AppDbContext _db;
    public UserVocabularyRepository(AppDbContext db) => _db = db;

    // Ghép bộ từ cá nhân với từ hệ thống (nếu có) thành một dòng để hiển thị.
    private IQueryable<UserVocabularyDto> Rows(int userId, string? search, out IQueryable<UserVocabulary> filtered)
    {
        var rows = from u in _db.UserVocabularies.AsNoTracking().Where(u => u.UserId == userId)
                   join v in _db.Vocabularies.AsNoTracking() on u.VocabId equals v.VocabId into vj
                   from v in vj.DefaultIfEmpty()
                   select new { u, v };
        if (!string.IsNullOrWhiteSpace(search))
        {
            var keyword = search.Trim();
            rows = rows.Where(x => (x.u.CustomWord ?? x.v.Lemma).Contains(keyword) || (x.u.CustomMeaning ?? x.v.MeaningVi).Contains(keyword));
        }
        filtered = rows.Select(x => x.u);
        return rows.OrderByDescending(x => x.u.UserVocabId).Select(x => new UserVocabularyDto
        {
            UserVocabId = x.u.UserVocabId, VocabId = x.u.VocabId, Word = x.u.CustomWord ?? x.v.Lemma,
            Meaning = x.u.CustomMeaning ?? x.v.MeaningVi, Example = x.u.CustomExample, Pos = x.v.PosCode, Cefr = x.v.CefrLevel,
            Ipa = x.v.IpaUs, SourceQuestionId = x.u.SourceQuestionId, CreatedAt = x.u.CreatedAt
        });
    }

    public async Task<(List<UserVocabularyDto> Items, int TotalCount)> ListAsync(int userId, UserVocabularyListRequestDto query)
    {
        var rows = Rows(userId, query.Search, out var filtered);
        var total = await filtered.CountAsync();
        var items = await rows.Skip((query.Page - 1) * query.PageSize).Take(query.PageSize).ToListAsync();
        return (items, total);
    }

    public Task<bool> SystemVocabularyExistsAsync(int vocabId) => _db.Vocabularies.AnyAsync(v => v.VocabId == vocabId && !v.IsDeleted);

    public Task<bool> QuestionExistsAsync(int questionId) => _db.Questions.AnyAsync(q => q.QuestionId == questionId && !q.IsDeleted);

    public Task<bool> ExistsAsync(int userId, int? vocabId, string? customWord) =>
        vocabId is not null
            ? _db.UserVocabularies.AnyAsync(u => u.UserId == userId && u.VocabId == vocabId)
            : _db.UserVocabularies.AnyAsync(u => u.UserId == userId && u.CustomWord == customWord);

    public async Task<UserVocabularyDto> AddAsync(UserVocabulary entity)
    {
        _db.UserVocabularies.Add(entity);
        await _db.SaveChangesAsync();
        _db.ChangeTracker.Clear();
        return await Rows(entity.UserId, null, out _).Where(i => i.UserVocabId == entity.UserVocabId).FirstAsync();
    }

    public async Task<bool> DeleteAsync(int userId, int userVocabId) =>
        await _db.UserVocabularies.Where(u => u.UserId == userId && u.UserVocabId == userVocabId).ExecuteDeleteAsync() > 0;
}
