using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using ToeicMind.Data;
using ToeicMind.Models.Exams;
using ToeicMind.Repositories.Exams;

namespace ToeicMind.Repositories.Learning;

/// <summary>
/// Truy cập dữ liệu Nghe chép. "Bộ clip luyện được" = ListeningItem chưa xóa, gắn với nhóm câu chưa xóa của một đề (và bộ đề) chưa xóa, có ít nhất một clip chưa xóa.
/// Không dùng cờ ListeningItem.IsPublished cho bộ clip cắt từ đề vì nhập/sửa nhóm câu từ Admin không bao giờ bật cờ này.
/// Bộ clip sưu tầm (UC-28 TH2, GroupId NULL) thì ngược lại: chỉ hiện khi Admin đã xuất bản.
/// Đề phải ở trạng thái PUBLISHED chỉ khi bật cấu hình Learning:StudyContentOnlyPublished (mặc định tắt, vì đề chỉ có phần Nghe không xuất bản được: sp_PublishExam đòi đủ 7 Part).
/// Clip chưa có audio vẫn hiện (người học nghe chép được khi Admin tải audio clip lên; chưa có thì trình luyện báo "chưa có âm thanh").
/// </summary>
public class DictationRepository : IDictationRepository
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    public DictationRepository(AppDbContext db, IConfiguration config) { _db = db; _config = config; }

    private IQueryable<ListeningItem> LiveItems()
    {
        var items = _db.ListeningItems.AsNoTracking()
            .Where(i => !i.IsDeleted && i.GroupId != null && !i.Group!.IsDeleted &&
                        !i.Group.Exam.IsDeleted && !i.Group.Exam.ExamSet.IsDeleted &&
                        i.Clips.Any(c => !c.IsDeleted));
        return _config.GetValue<bool>("Learning:StudyContentOnlyPublished")
            ? items.Where(i => i.Group!.Exam.Status == "PUBLISHED")
            : items;
    }

    public async Task<List<DictationItemRow>> GetItemsAsync(int? userId, DictationFilter filter)
    {
        List<DictationItemRow> rows = filter.Source == "STANDALONE" ? [] : await GetExamItemsAsync(userId, filter);
        // Bộ clip sưu tầm không thuộc bộ đề/đề và không có dạng đặc biệt: bỏ qua khi lọc theo các tiêu chí đó.
        if (filter.Source != "EXAM" && filter.ExamSetId is null && filter.ExamId is null && filter.SpecialTagId is null)
            rows.AddRange(await GetStandaloneItemsAsync(userId, filter));
        return rows;
    }

    // UC-28 TH2: bộ clip sưu tầm luyện được = chưa xóa, Admin đã xuất bản (đã có loại bài và Level), có ít nhất một clip chưa xóa.
    private async Task<List<DictationItemRow>> GetStandaloneItemsAsync(int? userId, DictationFilter filter)
    {
        var items = _db.ListeningItems.AsNoTracking()
            .Where(i => i.GroupId == null && !i.IsDeleted && i.IsPublished && i.CategoryId != null && i.Clips.Any(c => !c.IsDeleted));
        if (filter.ItemId is { } itemId) items = items.Where(i => i.ItemId == itemId);
        if (filter.PartNo is { } partNo) items = items.Where(i => i.PartNo == partNo);
        if (filter.CategoryIds is { } categoryIds) items = items.Where(i => categoryIds.Contains(i.CategoryId!.Value));
        if (filter.LevelNo is { } level) items = items.Where(i => i.LevelNo == level);

        var progress = _db.UserListeningProgress.AsNoTracking().Where(p => p.UserId == userId);
        var query = from i in items
                    join p in progress on i.ItemId equals p.ItemId into pj
                    from p in pj.DefaultIfEmpty()
                    orderby i.PartNo, i.ItemId
                    select new DictationItemRow(
                        i.ItemId, null, null, null, null, null, null, i.PartNo, null, null, i.CategoryId!.Value, i.LevelNo,
                        i.Clips.Count(c => !c.IsDeleted), i.Clips.Where(c => !c.IsDeleted).Sum(c => c.DurationSec),
                        p == null ? 0 : p.PracticeCount, p == null ? null : p.LastAccuracy, p == null ? null : p.BestAccuracy,
                        p == null ? null : p.LastMode, p == null ? null : p.LastPracticedAt, false, i.SourceNote);
        return await query.ToListAsync();
    }

    private async Task<List<DictationItemRow>> GetExamItemsAsync(int? userId, DictationFilter filter)
    {
        var items = LiveItems();
        if (filter.ItemId is { } itemId) items = items.Where(i => i.ItemId == itemId);
        if (filter.PartNo is { } partNo) items = items.Where(i => i.PartNo == partNo);
        if (filter.ExamId is { } examId) items = items.Where(i => i.Group!.ExamId == examId);
        if (filter.ExamSetId is { } setId) items = items.Where(i => i.Group!.Exam.ExamSetId == setId);
        if (filter.CategoryIds is { } categoryIds) items = items.Where(i => categoryIds.Contains(i.Group!.CategoryId));
        if (filter.SpecialTagId is { } tagId) items = items.Where(i => i.Group!.Tags.Any(t => t.SpecialTagId == tagId));
        // Level của bộ clip: Part 3, 4 lấy từ nhóm; Part 1, 2 (nhóm một câu) lấy từ câu hỏi.
        if (filter.LevelNo is { } level)
            items = items.Where(i => (i.Group!.GroupLevelNo ?? i.Group.Questions.Where(q => !q.IsDeleted).Min(q => q.LevelNo)) == level);

        var progress = _db.UserListeningProgress.AsNoTracking().Where(p => p.UserId == userId);
        var query = from i in items
                    join p in progress on i.ItemId equals p.ItemId into pj
                    from p in pj.DefaultIfEmpty()
                    orderby i.Group!.ExamId, i.PartNo, i.Group!.GroupOrder
                    select new DictationItemRow(
                        i.ItemId, i.GroupId!.Value, i.Group!.ExamId, i.Group!.Exam.ExamCode, i.Group!.Exam.Title, i.Group!.Exam.ExamSetId, i.Group!.Exam.ExamSet.Name,
                        i.PartNo, i.Group!.GroupOrder, i.Group!.Questions.Where(q => !q.IsDeleted).Min(q => (short?)q.QuestionNo), i.Group!.CategoryId,
                        i.Group!.GroupLevelNo ?? i.Group!.Questions.Where(q => !q.IsDeleted).Min(q => q.LevelNo),
                        i.Clips.Count(c => !c.IsDeleted),
                        i.Clips.Where(c => !c.IsDeleted).Sum(c => c.DurationSec),
                        p == null ? 0 : p.PracticeCount, p == null ? null : p.LastAccuracy, p == null ? null : p.BestAccuracy,
                        p == null ? null : p.LastMode, p == null ? null : p.LastPracticedAt,
                        i.Group!.Exam.ExamSet.ListeningAccess == Access.Vip, null);
        return await query.ToListAsync();
    }

    public async Task<ILookup<int, int>> GetTagsAsync(IReadOnlyCollection<int> groupIds)
    {
        var ids = groupIds.Distinct().ToList();
        var rows = await _db.QuestionGroupTags.AsNoTracking().Where(t => ids.Contains(t.GroupId))
            .Select(t => new { t.GroupId, t.SpecialTagId }).ToListAsync();
        return rows.ToLookup(r => r.GroupId, r => r.SpecialTagId);
    }

    public Task<List<DictationClipRow>> GetClipsAsync(int itemId) =>
        _db.ListeningClips.AsNoTracking()
            .Where(c => c.ItemId == itemId && !c.IsDeleted)
            .OrderBy(c => c.SeqNo)
            .Select(c => new DictationClipRow(c.ClipId, c.SeqNo, c.ClipRole, c.Speaker, c.TranscriptEn, c.TranslationVi, c.DurationSec,
                c.Media.Where(m => !m.IsDeleted && m.MediaType == "AUDIO").OrderBy(m => m.SortOrder).ThenBy(m => m.MediaId)
                    .Select(m => new PlayMediaSource(m.MediaId, m.ClipId, c.SeqNo, m.MediaType, m.AltText, m.SortOrder, m.StorageKey)).ToList()))
            .ToListAsync();

    public Task<string?> GetGroupTranslationAsync(int groupId) =>
        _db.QuestionGroups.AsNoTracking().Where(g => g.GroupId == groupId).Select(g => g.TranslationVi).FirstOrDefaultAsync();

    public async Task<DictationProgressRow> SaveProgressAsync(int userId, int itemId, string mode, decimal? accuracy, DateTime at)
    {
        if (!await TryUpdateAsync(userId, itemId, mode, accuracy, at))
        {
            try
            {
                _db.UserListeningProgress.Add(new UserListeningProgress
                {
                    UserId = userId, ItemId = itemId, PracticeCount = 1, FirstPracticedAt = at, LastPracticedAt = at,
                    LastMode = mode, LastAccuracy = accuracy, BestAccuracy = accuracy
                });
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (IsDuplicateKey(ex))
            {
                // Request khác vừa tạo dòng này: cộng lượt luyện vào dòng đó.
                _db.ChangeTracker.Clear();
                await TryUpdateAsync(userId, itemId, mode, accuracy, at);
            }
            finally { _db.ChangeTracker.Clear(); }
        }
        return await _db.UserListeningProgress.AsNoTracking().Where(p => p.UserId == userId && p.ItemId == itemId)
            .Select(p => new DictationProgressRow(p.PracticeCount, p.LastAccuracy, p.BestAccuracy, p.LastMode, p.LastPracticedAt)).FirstAsync();
    }

    // Cập nhật nguyên tử bằng một câu UPDATE; trả false nếu chưa có dòng.
    private async Task<bool> TryUpdateAsync(int userId, int itemId, string mode, decimal? accuracy, DateTime at)
    {
        var rows = _db.UserListeningProgress.Where(p => p.UserId == userId && p.ItemId == itemId);
        var changed = accuracy is null
            ? await rows.ExecuteUpdateAsync(s => s
                .SetProperty(p => p.PracticeCount, p => p.PracticeCount + 1)
                .SetProperty(p => p.LastPracticedAt, at)
                .SetProperty(p => p.LastMode, mode))
            : await rows.ExecuteUpdateAsync(s => s
                .SetProperty(p => p.PracticeCount, p => p.PracticeCount + 1)
                .SetProperty(p => p.LastPracticedAt, at)
                .SetProperty(p => p.LastMode, mode)
                .SetProperty(p => p.LastAccuracy, accuracy)
                .SetProperty(p => p.BestAccuracy, p => p.BestAccuracy == null || p.BestAccuracy < accuracy ? accuracy : p.BestAccuracy));
        return changed > 0;
    }

    public async Task TouchClipStudyDayAsync(int userId, DateOnly date, int clips)
    {
        var add = (short)Math.Clamp(clips, 0, short.MaxValue);
        var updated = await _db.StudyDays.Where(d => d.UserId == userId && d.StudyDate == date)
            .ExecuteUpdateAsync(s => s.SetProperty(d => d.ClipPracticeCount, d => (short)(d.ClipPracticeCount + add)));
        if (updated > 0) return;
        try
        {
            _db.StudyDays.Add(new StudyDay { UserId = userId, StudyDate = date, ClipPracticeCount = add });
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (IsDuplicateKey(ex))
        {
            _db.ChangeTracker.Clear();
            await _db.StudyDays.Where(d => d.UserId == userId && d.StudyDate == date)
                .ExecuteUpdateAsync(s => s.SetProperty(d => d.ClipPracticeCount, d => (short)(d.ClipPracticeCount + add)));
        }
        finally { _db.ChangeTracker.Clear(); }
    }

    private static bool IsDuplicateKey(Exception ex) =>
        ex.InnerException is SqlException { Number: 2601 or 2627 } || ex is SqlException { Number: 2601 or 2627 };
}
