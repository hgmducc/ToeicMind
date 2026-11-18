namespace ToeicMind.Repositories.Learning;

/// <summary>Hợp đồng truy cập báo cáo lỗi nội dung (xem ReportRepository).</summary>
public interface IReportRepository
{
    Task<bool> TargetExistsAsync(string targetType, int targetId);
    Task<bool> OpenDuplicateAsync(Report report);
    Task<Report?> AddAsync(Report report);
    Task<ReportDto?> FindAsync(int reportId, bool includeEmail);
    Task<(List<ReportDto> Items, int TotalCount)> ListAsync(int? reporterId, ReportListRequestDto query, bool includeEmail);
    Task<(ReportDto? Result, string? Error)> UpdateAsync(int reportId, string status, string? adminNote, int adminId);
    Task<int> CountNewAsync();
}
