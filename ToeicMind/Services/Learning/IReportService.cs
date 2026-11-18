namespace ToeicMind.Services.Learning;

/// <summary>Hợp đồng nghiệp vụ báo lỗi nội dung: người học gửi, Admin xử lý.</summary>
public interface IReportService
{
    Task<(ReportDto? Result, string? Error)> CreateAsync(int userId, CreateReportRequestDto dto);
    Task<ReportPageDto> ListMineAsync(int userId, ReportListRequestDto query);
    Task<ReportPageDto> ListAllAsync(ReportListRequestDto query);
    Task<(ReportDto? Result, string? Error)> UpdateAsync(int reportId, int adminId, UpdateReportRequestDto dto);
}
