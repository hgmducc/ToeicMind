using ToeicMind.Repositories.Learning;

namespace ToeicMind.Services.Learning;

/// <summary>
/// Nghiệp vụ báo lỗi nội dung (UC-14, UC-26): báo lỗi đúng một đối tượng (câu hỏi, từ vựng, bài ngữ pháp, bộ clip Nghe chép),
/// kiểm tra đối tượng tồn tại, chống gửi trùng khi người học còn báo cáo chờ xử lý cho cùng nội dung (BR-15), Admin đổi trạng thái.
/// </summary>
public class ReportService : IReportService
{
    private readonly IReportRepository _repo;
    public ReportService(IReportRepository repo) => _repo = repo;

    public async Task<(ReportDto? Result, string? Error)> CreateAsync(int userId, CreateReportRequestDto dto)
    {
        var description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();
        // Đúng một đối tượng, khớp TargetType (CK_Report_Target).
        int?[] ids = [dto.QuestionId, dto.VocabId, dto.ArticleId, dto.ListeningItemId];
        var targetId = dto.TargetType switch
        {
            "QUESTION" => dto.QuestionId,
            "VOCABULARY" => dto.VocabId,
            "GRAMMAR_ARTICLE" => dto.ArticleId,
            "LISTENING_ITEM" => dto.ListeningItemId,
            _ => null
        };
        if (targetId is null || ids.Count(id => id.HasValue) != 1 || dto.ErrorType == "OTHER" && description is null) return (null, "REPORT_INVALID");
        if (!await _repo.TargetExistsAsync(dto.TargetType, targetId.Value)) return (null, "REPORT_TARGET_NOT_FOUND");
        var report = new Report
        {
            ReporterId = userId, TargetType = dto.TargetType, QuestionId = dto.QuestionId, VocabId = dto.VocabId, ArticleId = dto.ArticleId,
            ListeningItemId = dto.ListeningItemId, ErrorType = dto.ErrorType, Description = description, Status = ReportStatus.New, CreatedAt = DateTime.UtcNow
        };
        if (await _repo.OpenDuplicateAsync(report)) return (null, "REPORT_DUPLICATE");
        var saved = await _repo.AddAsync(report);
        if (saved is null) return (null, "REPORT_DUPLICATE");
        return (await _repo.FindAsync(saved.ReportId, false), null);
    }

    public async Task<ReportPageDto> ListMineAsync(int userId, ReportListRequestDto query)
    {
        var (items, total) = await _repo.ListAsync(userId, query, false);
        return new ReportPageDto { Items = items, TotalCount = total, Page = query.Page, PageSize = query.PageSize };
    }

    public async Task<ReportPageDto> ListAllAsync(ReportListRequestDto query)
    {
        var (items, total) = await _repo.ListAsync(null, query, true);
        return new ReportPageDto { Items = items, TotalCount = total, Page = query.Page, PageSize = query.PageSize };
    }

    public async Task<(ReportDto? Result, string? Error)> UpdateAsync(int reportId, int adminId, UpdateReportRequestDto dto)
    {
        var note = string.IsNullOrWhiteSpace(dto.AdminNote) ? null : dto.AdminNote.Trim();
        return await _repo.UpdateAsync(reportId, dto.Status, note, adminId);
    }
}
