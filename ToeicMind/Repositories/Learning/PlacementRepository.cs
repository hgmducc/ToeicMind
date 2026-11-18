using System.Text.RegularExpressions;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using ToeicMind.Data;
using ToeicMind.Models.Exams;

namespace ToeicMind.Repositories.Learning;

/// <summary>
/// Truy cập dữ liệu bài kiểm tra đầu vào (CHG-007). "Nhóm ứng viên" = nhóm câu chưa xóa, còn câu, thuộc đề đã xuất bản và bộ đề chưa xóa.
/// Nhóm đã chọn mà sau này bị xóa vẫn giữ trong cấu hình (Admin thấy cảnh báo), người học không gặp nhóm đó.
/// </summary>
public partial class PlacementRepository : IPlacementRepository
{
    private const int PreviewLength = 160;
    private readonly AppDbContext _db;
    public PlacementRepository(AppDbContext db) => _db = db;

    private IQueryable<QuestionGroup> CandidateGroups() => _db.QuestionGroups.AsNoTracking()
        .Where(g => !g.IsDeleted && !g.Exam.IsDeleted && g.Exam.Status == "PUBLISHED" && !g.Exam.ExamSet.IsDeleted && g.Questions.Any(q => !q.IsDeleted));

    private IQueryable<PlacementGroupDto> Describe(IQueryable<QuestionGroup> groups) => groups.Select(g => new PlacementGroupDto
    {
        GroupId = g.GroupId, ExamId = g.ExamId, ExamCode = g.Exam.ExamCode, ExamTitle = g.Exam.Title, PartNo = g.PartNo, GroupOrder = g.GroupOrder,
        QuestionCount = g.Questions.Count(q => !q.IsDeleted),
        FirstQuestionNo = g.Questions.Where(q => !q.IsDeleted).Min(q => (short?)q.QuestionNo),
        LastQuestionNo = g.Questions.Where(q => !q.IsDeleted).Max(q => (short?)q.QuestionNo),
        LevelNo = g.GroupLevelNo ?? g.Questions.Where(q => !q.IsDeleted).Min(q => q.LevelNo),
        CategoryId = g.CategoryId,
        CategoryName = _db.QuestionCategories.Where(c => c.CategoryId == g.CategoryId).Select(c => c.NameVi).FirstOrDefault(),
        // Đoạn trích nhận diện nhóm: câu hỏi đầu, nếu không có thì transcript/đoạn văn (cắt sẵn trong SQL để không tải cả bài đọc).
        Preview = g.Questions.Where(q => !q.IsDeleted).OrderBy(q => q.QuestionNo).Select(q => q.QuestionText).FirstOrDefault()
                  ?? (g.TranscriptEn != null ? g.TranscriptEn.Substring(0, 400) : g.PassageHtml != null ? g.PassageHtml.Substring(0, 600) : null),
        HasAudio = g.Media.Any(m => !m.IsDeleted && m.MediaType == "AUDIO"),
        HasImage = g.Media.Any(m => !m.IsDeleted && m.MediaType == "IMAGE"),
        IsAvailable = !g.IsDeleted && !g.Exam.IsDeleted && !g.Exam.ExamSet.IsDeleted && g.Questions.Any(q => !q.IsDeleted)
    });

    private static List<PlacementGroupDto> Clean(List<PlacementGroupDto> items)
    {
        foreach (var item in items)
        {
            if (item.Preview is null) continue;
            var text = Spaces().Replace(Tags().Replace(item.Preview, " "), " ").Trim();
            item.Preview = text.Length > PreviewLength ? text[..PreviewLength].TrimEnd() + "…" : text;
        }
        return items;
    }

    public Task<List<PlacementTest>> ListAsync() =>
        _db.PlacementTests.AsNoTracking().Where(t => !t.IsDeleted)
            .OrderByDescending(t => t.IsActive).ThenByDescending(t => t.UpdatedAt).ThenByDescending(t => t.PlacementTestId).ToListAsync();

    public Task<PlacementTest?> GetAsync(int placementTestId) =>
        _db.PlacementTests.AsNoTracking().FirstOrDefaultAsync(t => t.PlacementTestId == placementTestId && !t.IsDeleted);

    public Task<List<PlacementGroupLink>> GetLinksAsync(IReadOnlyCollection<int> placementTestIds)
    {
        var ids = placementTestIds.Distinct().ToList();
        return _db.PlacementTestGroups.AsNoTracking().Where(l => ids.Contains(l.PlacementTestId))
            .OrderBy(l => l.PlacementTestId).ThenBy(l => l.SortOrder)
            .Select(l => new PlacementGroupLink(l.PlacementTestId, l.GroupId, l.SortOrder, l.Group.PartNo, l.Group.Questions.Count(q => !q.IsDeleted),
                !l.Group.IsDeleted && !l.Group.Exam.IsDeleted && !l.Group.Exam.ExamSet.IsDeleted && l.Group.Questions.Any(q => !q.IsDeleted)))
            .ToListAsync();
    }

    public async Task<Dictionary<int, int>> CountAttemptsAsync(IReadOnlyCollection<int> placementTestIds)
    {
        var ids = placementTestIds.Distinct().ToList();
        return await _db.PlacementAttempts.AsNoTracking().Where(p => ids.Contains(p.PlacementTestId))
            .GroupBy(p => p.PlacementTestId).Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count);
    }

    public async Task<List<PlacementGroupDto>> DescribeGroupsAsync(IReadOnlyCollection<int> groupIds)
    {
        var ids = groupIds.Distinct().ToList();
        if (ids.Count == 0) return [];
        return Clean(await Describe(_db.QuestionGroups.AsNoTracking().Where(g => ids.Contains(g.GroupId))).ToListAsync());
    }

    public async Task<(List<PlacementGroupDto> Items, int TotalCount)> SearchCandidatesAsync(PlacementCandidateRequestDto query, IReadOnlyCollection<int>? categoryIds)
    {
        var groups = CandidateGroups();
        if (query.PartNo is { } partNo) groups = groups.Where(g => g.PartNo == partNo);
        if (query.ExamId is { } examId) groups = groups.Where(g => g.ExamId == examId);
        if (query.LevelNo is { } level) groups = groups.Where(g => (g.GroupLevelNo ?? g.Questions.Where(q => !q.IsDeleted).Min(q => q.LevelNo)) == level);
        if (categoryIds is not null)
        {
            var ids = categoryIds.ToList();
            groups = groups.Where(g => ids.Contains(g.CategoryId));
        }
        var search = query.Search?.Trim();
        if (!string.IsNullOrEmpty(search))
            groups = groups.Where(g => g.Exam.ExamCode.Contains(search) || g.Exam.Title.Contains(search) ||
                                       g.Questions.Any(q => !q.IsDeleted && q.QuestionText != null && q.QuestionText.Contains(search)));
        var total = await groups.CountAsync();
        var items = await Describe(groups.OrderBy(g => g.PartNo).ThenBy(g => g.ExamId).ThenBy(g => g.GroupOrder)
            .Skip((query.Page - 1) * query.PageSize).Take(query.PageSize)).ToListAsync();
        return (Clean(items), total);
    }

    public Task<List<PlacementPoolRow>> GetPoolAsync(int? examId)
    {
        var groups = CandidateGroups();
        if (examId is { } id) groups = groups.Where(g => g.ExamId == id);
        return groups.Select(g => new PlacementPoolRow(g.GroupId, g.ExamId, g.PartNo, g.GroupLevelNo ?? g.Questions.Where(q => !q.IsDeleted).Min(q => q.LevelNo),
            g.Questions.Count(q => !q.IsDeleted), g.CategoryId)).ToListAsync();
    }

    public async Task<HashSet<int>> ValidGroupIdsAsync(IReadOnlyCollection<int> groupIds)
    {
        var ids = groupIds.Distinct().ToList();
        return (await CandidateGroups().Where(g => ids.Contains(g.GroupId)).Select(g => g.GroupId).ToListAsync()).ToHashSet();
    }

    public async Task<(PlacementTest? Entity, string? Error)> SaveAsync(PlacementTest requested, IReadOnlyList<int> groupIds, bool create)
    {
        try
        {
            await using var transaction = await _db.Database.BeginTransactionAsync();
            var entity = create ? requested
                : await _db.PlacementTests.FirstOrDefaultAsync(t => t.PlacementTestId == requested.PlacementTestId && !t.IsDeleted);
            if (entity is null) return (null, "PLACEMENT_TEST_NOT_FOUND");
            var now = DateTime.UtcNow;
            // Tối đa một bài đang dùng: tắt bài khác trước khi bật bài này (UX_PlacementTest_Active chặn trường hợp đua).
            if (requested.IsActive)
                await _db.PlacementTests.Where(t => t.IsActive && t.PlacementTestId != entity.PlacementTestId)
                    .ExecuteUpdateAsync(s => s.SetProperty(t => t.IsActive, false).SetProperty(t => t.UpdatedAt, now));
            entity.Title = requested.Title;
            entity.Description = requested.Description;
            entity.TimeLimitSeconds = requested.TimeLimitSeconds;
            entity.IsActive = requested.IsActive;
            entity.UpdatedAt = now;
            if (create)
            {
                entity.CreatedAt = now;
                _db.PlacementTests.Add(entity);
            }
            await _db.SaveChangesAsync();
            if (!create) await _db.PlacementTestGroups.Where(g => g.PlacementTestId == entity.PlacementTestId).ExecuteDeleteAsync();
            _db.PlacementTestGroups.AddRange(groupIds.Select((groupId, index) =>
                new PlacementTestGroup { PlacementTestId = entity.PlacementTestId, GroupId = groupId, SortOrder = (short)index }));
            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
            return (entity, null);
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 })
        {
            return (null, "CONCURRENT_CHANGE");
        }
        finally { _db.ChangeTracker.Clear(); }
    }

    public async Task<string?> SoftDeleteAsync(int placementTestId)
    {
        var now = DateTime.UtcNow;
        var changed = await _db.PlacementTests.Where(t => t.PlacementTestId == placementTestId && !t.IsDeleted)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.IsDeleted, true).SetProperty(t => t.IsActive, false)
                .SetProperty(t => t.DeletedAt, (DateTime?)now).SetProperty(t => t.UpdatedAt, now));
        return changed == 0 ? "PLACEMENT_TEST_NOT_FOUND" : null;
    }

    public Task<PlacementTest?> GetActiveAsync() =>
        _db.PlacementTests.AsNoTracking().FirstOrDefaultAsync(t => t.IsActive && !t.IsDeleted);

    public Task<int?> GetInProgressAttemptIdAsync(int userId) =>
        _db.Attempts.AsNoTracking()
            .Where(a => a.UserId == userId && !a.IsDeleted && a.Scope == AttemptScope.Placement && a.Status == AttemptStatus.InProgress)
            .OrderByDescending(a => a.StartedAt).Select(a => (int?)a.AttemptId).FirstOrDefaultAsync();

    // Kết quả gần nhất kể cả khi người học đã xóa lượt khỏi lịch sử: trình độ đầu vào vẫn là dữ liệu cá nhân hóa hợp lệ.
    public Task<PlacementAttemptRow?> GetLastResultAsync(int userId) =>
        _db.Attempts.AsNoTracking()
            .Where(a => a.UserId == userId && a.Scope == AttemptScope.Placement && a.Status == AttemptStatus.Submitted)
            .OrderByDescending(a => a.SubmittedAt).ThenByDescending(a => a.AttemptId)
            .Select(a => new PlacementAttemptRow(a.AttemptId,
                _db.PlacementAttempts.Where(p => p.AttemptId == a.AttemptId).Select(p => (int?)p.PlacementTestId).FirstOrDefault(),
                _db.PlacementAttempts.Where(p => p.AttemptId == a.AttemptId)
                    .Join(_db.PlacementTests, p => p.PlacementTestId, t => t.PlacementTestId, (p, t) => t.Title).FirstOrDefault(),
                a.SubmittedAt, a.TotalQuestions, a.CorrectCount, a.ListeningScaled, a.ReadingScaled, a.TotalScaled))
            .FirstOrDefaultAsync();

    [GeneratedRegex("<[^>]*>")]
    private static partial Regex Tags();
    [GeneratedRegex(@"\s+")]
    private static partial Regex Spaces();
}
