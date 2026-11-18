using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToeicMind.Services.Learning;

namespace ToeicMind.Controllers;

/// <summary>Người học báo lỗi nội dung (câu hỏi, đáp án, giải thích, media, từ vựng) và xem các báo lỗi của mình. Admin xử lý ở /api/admin/reports.</summary>
[Route("api/reports")]
[Authorize]
public class ReportsController : ApiControllerBase
{
    private readonly IReportService _reports;
    public ReportsController(IReportService reports) => _reports = reports;

    /// <summary>Các báo lỗi tôi đã gửi và trạng thái xử lý.</summary>
    [HttpGet]
    public async Task<IActionResult> Mine([FromQuery] ReportListRequestDto query) =>
        Ok(await _reports.ListMineAsync(UserId, query));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateReportRequestDto dto) =>
        Respond(await _reports.CreateAsync(UserId, dto), StatusCodes.Status201Created);
}
