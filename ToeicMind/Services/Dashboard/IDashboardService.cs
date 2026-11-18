using ToeicMind.DTOs.Dashboard.Request;
using ToeicMind.DTOs.Dashboard.Response;

namespace ToeicMind.Services.Dashboard;

/// <summary>Hợp đồng nghiệp vụ thống kê cho Admin: trang tổng quan (tổng quan, hoạt động, đề phổ biến, câu khó) và thống kê một học viên.</summary>
public interface IDashboardService
{
    Task<AdminDashboardDto> GetAsync(AdminDashboardRequestDto query);
    Task<LearnerStatsDto> GetLearnerStatsAsync(int userId);
}
