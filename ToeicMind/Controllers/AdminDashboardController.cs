using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToeicMind.DTOs.Dashboard.Request;
using ToeicMind.Services.Dashboard;

namespace ToeicMind.Controllers;

/// <summary>API thống kê cho trang tổng quan của Admin. Chỉ ADMIN, chỉ đọc. Ngày tính theo UTC.</summary>
[Route("api/admin/dashboard")]
[Authorize(Roles = "ADMIN")]
public class AdminDashboardController : ApiControllerBase
{
    private readonly IDashboardService _dashboard;
    public AdminDashboardController(IDashboardService dashboard) => _dashboard = dashboard;

    /// <summary>
    /// Toàn bộ số liệu trang tổng quan trong một phản hồi: summary (người dùng, kho đề, lượt làm bài, học viên hoạt động 7 ngày, điểm/độ chính xác trung bình, báo lỗi mới),
    /// activity (người dùng mới, lượt làm, học viên hoạt động theo từng ngày; days 1–90, mặc định 30),
    /// popularExams (đề được làm nhiều nhất kèm kết quả trung bình) và hardestQuestions (câu có tỷ lệ sai cao nhất, chỉ xét câu có ít nhất minAnswers lượt trả lời); limit 1–50 cho hai danh sách.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] AdminDashboardRequestDto query) => Ok(await _dashboard.GetAsync(query));
}
