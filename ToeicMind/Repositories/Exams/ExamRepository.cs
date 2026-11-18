using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using ToeicMind.Data;
using ToeicMind.DTOs.Exams.Request;
using ToeicMind.Models.Exams;

namespace ToeicMind.Repositories.Exams;

/// <summary>Truy vấn bộ đề và đề thi: danh sách, chi tiết, lưu, xóa mềm, khôi phục.</summary>
public class ExamRepository : IExamRepository
{
    private readonly AppDbContext _db;
    public ExamRepository(AppDbContext db) => _db = db;

    public async Task<(IReadOnlyList<ExamSetSummary> Items, int TotalCount)> ListSetsAsync(
        ExamPageRequestDto query, bool learner, bool deleted = false)
    {
        var sets = _db.ExamSets.AsNoTracking().Where(s => s.IsDeleted == (learner ? false : deleted));
        if (learner)
            sets = sets.Where(s => _db.Exams.Any(e => e.ExamSetId == s.ExamSetId && !e.IsDeleted && e.Status == "PUBLISHED"));
        var search = query.Search?.Trim();
        if (!string.IsNullOrEmpty(search)) sets = sets.Where(s => s.Name.Contains(search));

        var totalCount = await sets.CountAsync();
        var items = await Summaries(sets.OrderBy(s => s.Name).ThenBy(s => s.ExamSetId)
            .Skip((query.Page - 1) * query.PageSize).Take(query.PageSize), learner).ToListAsync();
        return (items, totalCount);
    }

    public Task<ExamSetSummary?> GetSetAsync(int id, bool learner) =>
        Summaries(_db.ExamSets.AsNoTracking().Where(s => s.ExamSetId == id)
            .Where(s => !learner || (!s.IsDeleted && _db.Exams.Any(e => e.ExamSetId == s.ExamSetId && !e.IsDeleted && e.Status == "PUBLISHED"))), learner)
            .FirstOrDefaultAsync();

    private IQueryable<ExamSetSummary> Summaries(IQueryable<ExamSet> sets, bool learner) =>
        sets.Select(s => new ExamSetSummary
        {
            ExamSet = s,
            ExamCount = _db.Exams.Count(e => e.ExamSetId == s.ExamSetId && !e.IsDeleted && (!learner || e.Status == "PUBLISHED")),
            PublishedExamCount = _db.Exams.Count(e => e.ExamSetId == s.ExamSetId && !e.IsDeleted && e.Status == "PUBLISHED")
        });

    public async Task<(IReadOnlyList<Exam> Items, int TotalCount)> ListExamsAsync(
        ExamBrowseRequestDto query, bool learner, string? status = null, bool deleted = false)
    {
        var exams = _db.Exams.AsNoTracking().Where(e => e.IsDeleted == (learner ? false : deleted));
        if (learner) exams = exams.Where(e => e.Status == "PUBLISHED" && !e.ExamSet.IsDeleted);
        else if (status is not null) exams = exams.Where(e => e.Status == status);
        if (query.ExamSetId.HasValue) exams = exams.Where(e => e.ExamSetId == query.ExamSetId.Value);
        var search = query.Search?.Trim();
        if (!string.IsNullOrEmpty(search))
            exams = exams.Where(e => e.Title.Contains(search) || e.ExamCode.Contains(search));

        var totalCount = await exams.CountAsync();
        var items = await Headers(exams.OrderBy(e => e.ExamSetId).ThenBy(e => e.Title).ThenBy(e => e.ExamId)
            .Skip((query.Page - 1) * query.PageSize).Take(query.PageSize)).ToListAsync();
        return (items, totalCount);
    }

    public Task<Exam?> GetExamAsync(int id, bool learner) =>
        Headers(_db.Exams.AsNoTracking().Where(e => e.ExamId == id &&
            (!learner || (!e.IsDeleted && e.Status == "PUBLISHED" && !e.ExamSet.IsDeleted)))).FirstOrDefaultAsync();

    // Danh sách/metadata không tải khối JSON Excel; chỉ API đối soát mới đọc nguồn nhập.
    private static IQueryable<Exam> Headers(IQueryable<Exam> query) => query.Select(e => new Exam
    {
        ExamId = e.ExamId, ExamSetId = e.ExamSetId, ExamCode = e.ExamCode, Title = e.Title, Description = e.Description,
        Status = e.Status, IsPublic = e.IsPublic, AccessLevel = e.AccessLevel, EffectiveAccess = e.AccessLevel ?? e.ExamSet.ExamAccess, IsDeleted = e.IsDeleted, DeletedAt = e.DeletedAt,
        CreatedBy = e.CreatedBy, CreatedAt = e.CreatedAt, UpdatedAt = e.UpdatedAt
    });

    public async Task<(ExamSet? Entity, string? Error)> SaveSetAsync(ExamSet requested, bool create)
    {
        try
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            var entity = create ? requested : await _db.ExamSets.FirstOrDefaultAsync(s => s.ExamSetId == requested.ExamSetId);
            if (entity is null) return (null, "EXAM_SET_NOT_FOUND");
            if (entity.IsDeleted) return (null, "EXAM_SET_DELETED");
            // Đổi quyền làm đề của bộ làm đổi quyền thực tế của các đề kế thừa; cập nhật UpdatedAt để cache vào đề (modes) tự hết hiệu lực.
            var examAccessChanged = !create && entity.ExamAccess != requested.ExamAccess;
            entity.Name = requested.Name;
            entity.Description = requested.Description;
            entity.ExamAccess = requested.ExamAccess;
            entity.VocabAccess = requested.VocabAccess;
            entity.ListeningAccess = requested.ListeningAccess;
            entity.ReadingAccess = requested.ReadingAccess;
            entity.UpdatedAt = DateTime.UtcNow;
            if (create) _db.ExamSets.Add(entity);
            await _db.SaveChangesAsync();
            if (examAccessChanged)
                await _db.Exams.Where(e => e.ExamSetId == entity.ExamSetId).ExecuteUpdateAsync(s => s.SetProperty(e => e.UpdatedAt, DateTime.UtcNow));
            await transaction.CommitAsync();
            return (entity, null);
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 })
        {
            return (null, "EXAM_SET_NAME_EXISTS");
        }
        catch (Exception ex) when (IsDeadlock(ex)) { return (null, "CONCURRENT_CHANGE"); }
    }

    public async Task<(Exam? Entity, string? Error)> SaveExamAsync(Exam requested, bool create, bool preserveCode = false)
    {
        try
        {
            // Khóa cùng giao dịch để tạo/chuyển đề không đua với xóa mềm bộ.
            await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            var entity = create ? requested : await _db.Exams.FirstOrDefaultAsync(e => e.ExamId == requested.ExamId);
            if (entity is null) return (null, "EXAM_NOT_FOUND");
            if (entity.IsDeleted) return (null, "EXAM_DELETED");
            if (!create && preserveCode) requested.ExamCode = entity.ExamCode;
            if (!create && (entity.ExamSetId != requested.ExamSetId || entity.ExamCode != requested.ExamCode) &&
                await _db.Database.SqlQuery<int>($"SELECT CONVERT(int,dbo.fn_ExamHasHistory({entity.ExamId})) AS Value").SingleAsync() == 1)
                return (null, "EXAM_CONTENT_LOCKED");
            if (!create && entity.Status == "PUBLISHED" &&
                (entity.ExamSetId != requested.ExamSetId || entity.ExamCode != requested.ExamCode))
                return (null, "EXAM_MUST_BE_DRAFT");
            var parent = await _db.ExamSets.AsNoTracking().FirstOrDefaultAsync(s => s.ExamSetId == requested.ExamSetId);
            if (parent is null) return (null, "EXAM_SET_NOT_FOUND");
            if (parent.IsDeleted) return (null, "EXAM_SET_DELETED");

            entity.ExamSetId = requested.ExamSetId;
            entity.ExamCode = requested.ExamCode;
            entity.Title = requested.Title;
            entity.Description = requested.Description;
            entity.AccessLevel = requested.AccessLevel;
            entity.UpdatedAt = DateTime.UtcNow;
            if (create) _db.Exams.Add(entity);
            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
            return (entity, null);
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 } sql)
        {
            return (null, sql.Message.Contains("UX_Exam_Set_Code", StringComparison.Ordinal) ? "EXAM_CODE_EXISTS" : "EXAM_TITLE_EXISTS");
        }
        catch (Exception ex) when (IsDeadlock(ex)) { return (null, "CONCURRENT_CHANGE"); }
    }

    public async Task<string?> SetDeletedAsync(int id, bool deleted)
    {
        try
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            var entity = await _db.ExamSets.FirstOrDefaultAsync(s => s.ExamSetId == id);
            if (entity is null) return "EXAM_SET_NOT_FOUND";
            if (entity.IsDeleted == deleted) return null;
            if (deleted && await _db.Exams.AnyAsync(e => e.ExamSetId == id && !e.IsDeleted))
                return "EXAM_SET_NOT_EMPTY";

            entity.IsDeleted = deleted;
            entity.DeletedAt = deleted ? DateTime.UtcNow : null;
            entity.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
            return null;
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 })
        {
            return "EXAM_SET_NAME_EXISTS";
        }
        catch (Exception ex) when (IsDeadlock(ex)) { return "CONCURRENT_CHANGE"; }
    }

    public async Task<string?> ExamDeletedAsync(int id, bool deleted)
    {
        try
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            var entity = await _db.Exams.FirstOrDefaultAsync(e => e.ExamId == id);
            if (entity is null) return "EXAM_NOT_FOUND";
            if (entity.IsDeleted == deleted) return null;
            if (!deleted && !await _db.ExamSets.AnyAsync(s => s.ExamSetId == entity.ExamSetId && !s.IsDeleted))
                return "EXAM_SET_DELETED";

            entity.IsDeleted = deleted;
            entity.DeletedAt = deleted ? DateTime.UtcNow : null;
            entity.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
            return null;
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 } sql)
        {
            return sql.Message.Contains("UX_Exam_Set_Code", StringComparison.Ordinal) ? "EXAM_CODE_EXISTS" : "EXAM_TITLE_EXISTS";
        }
        catch (Exception ex) when (IsDeadlock(ex)) { return "CONCURRENT_CHANGE"; }
    }

    private static bool IsDeadlock(Exception ex) =>
        ex is SqlException { Number: 1205 } || ex.InnerException is SqlException { Number: 1205 };
}
