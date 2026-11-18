using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using ToeicMind.Data;

namespace ToeicMind.Repositories.Learning;

/// <summary>Truy cập báo cáo lỗi nội dung của người học; Admin xử lý.</summary>
public class ReportRepository : IReportRepository
{
    private readonly AppDbContext _db;
    public ReportRepository(AppDbContext db) => _db = db;

    // Bộ clip Nghe chép báo được khi người học thấy được: cắt từ đề, hoặc sưu tầm đã xuất bản.
    public Task<bool> TargetExistsAsync(string targetType, int targetId) => targetType switch
    {
        "QUESTION" => _db.Questions.AnyAsync(q => q.QuestionId == targetId && !q.IsDeleted),
        "VOCABULARY" => _db.Vocabularies.AnyAsync(v => v.VocabId == targetId && !v.IsDeleted),
        "GRAMMAR_ARTICLE" => _db.GrammarArticles.AnyAsync(a => a.ArticleId == targetId && !a.IsDeleted),
        "LISTENING_ITEM" => _db.ListeningItems.AnyAsync(i => i.ItemId == targetId && !i.IsDeleted && (i.GroupId != null || i.IsPublished)),
        _ => Task.FromResult(false)
    };

    // BR-15 / UX_Report_Open: mỗi người chỉ có một báo cáo đang mở cho cùng nội dung, không phân biệt loại lỗi.
    public Task<bool> OpenDuplicateAsync(Report report) =>
        _db.Reports.AnyAsync(r => r.ReporterId == report.ReporterId && r.QuestionId == report.QuestionId && r.VocabId == report.VocabId &&
            r.ArticleId == report.ArticleId && r.ListeningItemId == report.ListeningItemId &&
            (r.Status == ReportStatus.New || r.Status == ReportStatus.InProgress));

    /// <summary>Trả null khi UX_Report_Open từ chối (hai request gửi đồng thời).</summary>
    public async Task<Report?> AddAsync(Report report)
    {
        _db.Reports.Add(report);
        try
        {
            await _db.SaveChangesAsync();
            return report;
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex)) { return null; }
        finally { _db.ChangeTracker.Clear(); }
    }

    private IQueryable<ReportDto> Rows(IQueryable<Report> reports, bool includeEmail) =>
        reports.Select(r => new ReportDto
        {
            ReportId = r.ReportId, TargetType = r.TargetType, QuestionId = r.QuestionId, VocabId = r.VocabId, ArticleId = r.ArticleId,
            ListeningItemId = r.ListeningItemId, ErrorType = r.ErrorType, Description = r.Description, Status = r.Status, AdminNote = r.AdminNote,
            CreatedAt = r.CreatedAt, HandledAt = r.HandledAt,
            ReporterEmail = includeEmail ? _db.Users.Where(u => u.UserId == r.ReporterId).Select(u => u.Email).FirstOrDefault() : null
        });

    public async Task<(List<ReportDto> Items, int TotalCount)> ListAsync(int? reporterId, ReportListRequestDto query, bool includeEmail)
    {
        var reports = _db.Reports.AsNoTracking().AsQueryable();
        if (reporterId is not null) reports = reports.Where(r => r.ReporterId == reporterId);
        if (query.Status is not null) reports = reports.Where(r => r.Status == query.Status);
        var total = await reports.CountAsync();
        var items = await Rows(reports.OrderByDescending(r => r.ReportId).Skip((query.Page - 1) * query.PageSize).Take(query.PageSize), includeEmail)
            .ToListAsync();
        await FillTargetsAsync(items);
        return (items, total);
    }

    public async Task<ReportDto?> FindAsync(int reportId, bool includeEmail)
    {
        var report = await Rows(_db.Reports.AsNoTracking().Where(r => r.ReportId == reportId), includeEmail).FirstOrDefaultAsync();
        if (report is not null) await FillTargetsAsync([report]);
        return report;
    }

    /// <summary>Mở lại báo cáo đã đóng (về IN_PROGRESS) bị UX_Report_Open từ chối khi người học đã có báo cáo khác đang mở cho cùng nội dung.</summary>
    public async Task<(ReportDto? Result, string? Error)> UpdateAsync(int reportId, string status, string? adminNote, int adminId)
    {
        int changed;
        try
        {
            changed = await _db.Reports.Where(r => r.ReportId == reportId).ExecuteUpdateAsync(s => s
                .SetProperty(r => r.Status, status).SetProperty(r => r.AdminNote, adminNote)
                .SetProperty(r => r.HandledBy, (int?)adminId).SetProperty(r => r.HandledAt, (DateTime?)DateTime.UtcNow));
        }
        catch (Exception ex) when (IsUniqueViolation(ex)) { return (null, "REPORT_REOPEN_CONFLICT"); }
        if (changed == 0) return (null, "REPORT_NOT_FOUND");
        return (await FindAsync(reportId, true), null);
    }

    public Task<int> CountNewAsync() => _db.Reports.CountAsync(r => r.Status == ReportStatus.New);

    // Tên nội dung, đề chứa nội dung và trạng thái xóa: mỗi loại đối tượng một truy vấn cho cả trang.
    private async Task FillTargetsAsync(List<ReportDto> reports)
    {
        var questionIds = reports.Where(r => r.QuestionId is not null).Select(r => r.QuestionId!.Value).Distinct().ToList();
        var vocabIds = reports.Where(r => r.VocabId is not null).Select(r => r.VocabId!.Value).Distinct().ToList();
        var articleIds = reports.Where(r => r.ArticleId is not null).Select(r => r.ArticleId!.Value).Distinct().ToList();
        var itemIds = reports.Where(r => r.ListeningItemId is not null).Select(r => r.ListeningItemId!.Value).Distinct().ToList();

        var questions = questionIds.Count == 0 ? [] : await _db.Questions.AsNoTracking().Where(q => questionIds.Contains(q.QuestionId))
            .Select(q => new TargetRow(q.QuestionId, _db.Exams.Where(e => e.ExamId == q.ExamId).Select(e => e.ExamCode).FirstOrDefault() + " · Câu " + q.QuestionNo.ToString(),
                q.ExamId, q.IsDeleted || q.Group.IsDeleted)).ToListAsync();
        var vocabs = vocabIds.Count == 0 ? [] : await _db.Vocabularies.AsNoTracking().Where(v => vocabIds.Contains(v.VocabId))
            .Select(v => new TargetRow(v.VocabId, v.Lemma + " (" + v.PosCode + ")", null, v.IsDeleted)).ToListAsync();
        var articles = articleIds.Count == 0 ? [] : await _db.GrammarArticles.AsNoTracking().Where(a => articleIds.Contains(a.ArticleId))
            .Select(a => new TargetRow(a.ArticleId, a.Title, null, a.IsDeleted)).ToListAsync();
        var items = itemIds.Count == 0 ? [] : await _db.ListeningItems.AsNoTracking().Where(i => itemIds.Contains(i.ItemId))
            .Select(i => new TargetRow(i.ItemId,
                i.GroupId == null ? (i.SourceNote ?? "Bộ clip sưu tầm #" + i.ItemId.ToString()) : i.Group!.Exam.ExamCode + " · Part " + i.PartNo.ToString() + " · nhóm " + i.Group.GroupOrder.ToString(),
                i.GroupId == null ? null : i.Group!.ExamId, i.IsDeleted)).ToListAsync();

        var byType = new Dictionary<string, Dictionary<int, TargetRow>>
        {
            ["QUESTION"] = questions.ToDictionary(t => t.Id), ["VOCABULARY"] = vocabs.ToDictionary(t => t.Id),
            ["GRAMMAR_ARTICLE"] = articles.ToDictionary(t => t.Id), ["LISTENING_ITEM"] = items.ToDictionary(t => t.Id)
        };
        foreach (var report in reports)
        {
            var id = report.QuestionId ?? report.VocabId ?? report.ArticleId ?? report.ListeningItemId;
            if (id is null || !byType.TryGetValue(report.TargetType, out var map) || !map.TryGetValue(id.Value, out var target))
            {
                report.TargetDeleted = true;
                continue;
            }
            report.TargetTitle = target.Title;
            report.ExamId = target.ExamId;
            report.TargetDeleted = target.Deleted;
        }
    }

    private sealed record TargetRow(int Id, string Title, int? ExamId, bool Deleted);

    private static bool IsUniqueViolation(Exception ex) =>
        (ex as SqlException ?? ex.InnerException as SqlException) is { Number: 2601 or 2627 };
}
