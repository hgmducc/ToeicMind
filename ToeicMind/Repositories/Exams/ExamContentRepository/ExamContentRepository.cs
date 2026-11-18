using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using ToeicMind.Data;
using ToeicMind.DTOs.Exams.Response;
using ToeicMind.Models.Exams;

namespace ToeicMind.Repositories.Exams;

/// <summary>
/// Truy cập dữ liệu nội dung đề thi. Lớp được chia thành nhiều file theo chức năng:
/// Package (nhập cả đề), Groups (nhóm/câu hỏi), Directions (hướng dẫn), Media, Publishing (xuất bản).
/// File này giữ phần dùng chung: danh mục, kiểm tra khóa nội dung và hàm bọc giao dịch.
/// </summary>
public partial class ExamContentRepository : IExamContentRepository
{
    private static readonly TimeSpan CatalogTtl = TimeSpan.FromMinutes(10);

    private readonly AppDbContext _db;
    private readonly IMemoryCache _cache;

    public ExamContentRepository(AppDbContext db, IMemoryCache cache)
    {
        _db = db;
        _cache = cache;
    }

    // Danh mục (Part, Level, phân loại, cờ đặc biệt) ít đổi và dùng chung cho mọi người dùng (kể cả khách) nên giữ trong RAM vài phút.
    public async Task<ExamCatalogDto> GetCatalogAsync() =>
        (await _cache.GetOrCreateAsync("exam:catalog", entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CatalogTtl;
            return LoadCatalogAsync();
        }))!;

    private async Task<ExamCatalogDto> LoadCatalogAsync() => new()
    {
        Parts = await _db.PartSettings.AsNoTracking().OrderBy(p => p.PartNo).Select(p => new PartCatalogDto
        { PartNo = p.PartNo, PartName = p.PartName, Skill = p.Skill, StandardQuestionCount = p.StandardQuestionCount, OptionCount = p.OptionCount, DefaultSecondsPerQuestion = p.DefaultSecondsPerQuestion }).ToListAsync(),
        Levels = await _db.LevelBands.AsNoTracking().OrderBy(l => l.LevelNo).Select(l => new LevelCatalogDto
        { LevelNo = l.LevelNo, NameVi = l.NameVi, ShortLabel = l.ShortLabel }).ToListAsync(),
        Categories = await _db.QuestionCategories.AsNoTracking().Where(c => c.IsActive).OrderBy(c => c.PartNo).ThenBy(c => c.SortOrder)
            .ThenBy(c => c.CategoryId).Select(c => new CategoryCatalogDto
            {
                CategoryId = c.CategoryId,
                PartNo = c.PartNo,
                ParentCategoryId = c.ParentCategoryId,
                Code = c.Code,
                NameVi = c.NameVi,
                NameEn = c.NameEn,
                SortOrder = c.SortOrder,
                IsLeaf = !_db.QuestionCategories.Any(child => child.ParentCategoryId == c.CategoryId)
            }).ToListAsync(),
        SpecialTags = await _db.SpecialTags.AsNoTracking().OrderBy(t => t.PartNo).ThenBy(t => t.SpecialTagId).Select(t => new SpecialTagCatalogDto
        { SpecialTagId = t.SpecialTagId, PartNo = t.PartNo, Code = t.Code, NameVi = t.NameVi }).ToListAsync()
    };

    public async Task<bool> HasAttemptsAsync(int examId) =>
        await _db.Database.SqlQuery<int>($"SELECT CONVERT(int,dbo.fn_ExamHasHistory({examId})) AS Value").SingleAsync() == 1;

    public Task<string?> GetImportSourceAsync(int examId) =>
        _db.Exams.AsNoTracking().Where(e => e.ExamId == examId && !e.IsDeleted && !e.ExamSet.IsDeleted)
            .Select(e => e.ImportSourceJson).FirstOrDefaultAsync();

    private async Task<string?> GuardAsync(int? examId, bool requireDraft)
    {
        if (!examId.HasValue)
        {
            return null;
        }
        var exam = await _db.Exams.AsNoTracking().Where(e => e.ExamId == examId && !e.IsDeleted && !e.ExamSet.IsDeleted)
            .Select(e => new { e.Status }).FirstOrDefaultAsync();
        if (exam is null) return "EXAM_NOT_FOUND";
        if (await HasAttemptsAsync(examId.Value)) return "EXAM_CONTENT_LOCKED";
        return requireDraft && exam.Status != "DRAFT" ? "EXAM_MUST_BE_DRAFT" : null;
    }

    private async Task<bool> DefaultDirectionUsedAsync(ExamDirection direction) =>
        await _db.Database.SqlQuery<int>($"""
            SELECT CASE WHEN EXISTS(SELECT 1 FROM dbo.Exam exam WHERE dbo.fn_ExamHasHistory(exam.ExamId)=1
                AND NOT EXISTS(SELECT 1 FROM dbo.ExamDirection own WHERE own.ExamId=exam.ExamId AND own.IsDeleted=0
                    AND own.DirectionKind={direction.DirectionKind}
                    AND (own.Skill={direction.Skill} OR (own.Skill IS NULL AND {direction.Skill} IS NULL))
                    AND ISNULL(own.PartNo,0)=ISNULL({direction.PartNo},0))) THEN 1 ELSE 0 END AS Value
            """).SingleAsync() == 1;

    private async Task<(T? Result, string? Error)> ChangeAsync<T>(int? examId, Func<Task<(T? Result, string? Error)>> change, bool requireDraft = true) where T : class
    {
        try
        {
            // Lô nhập dùng cùng transaction; lỗi bất kỳ được rollback ở SavePackageAsync.
            await using var transaction = _db.Database.CurrentTransaction is null
                ? await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable) : null;
            var error = await GuardAsync(examId, requireDraft);
            if (error is not null) return (null, error);
            var result = await change();
            if (result.Error is not null) return result;
            if (examId.HasValue)
                await _db.Exams.Where(e => e.ExamId == examId).ExecuteUpdateAsync(s => s.SetProperty(e => e.UpdatedAt, DateTime.UtcNow));
            await _db.SaveChangesAsync();
            if (transaction is not null) await transaction.CommitAsync();
            return result;
        }
        catch (Exception ex) when (SqlError(ex, 1205)) { return (null, "CONCURRENT_CHANGE"); }
        catch (DbUpdateException ex) when (SqlError(ex, 2601) || SqlError(ex, 2627)) { return (null, "EXAM_CONTENT_CONFLICT"); }
    }

    private static bool SqlError(Exception exception, int number) =>
        exception is SqlException sql && sql.Number == number || exception.InnerException is SqlException inner && inner.Number == number;
}
