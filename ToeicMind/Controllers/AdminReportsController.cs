using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToeicMind.Services.Learning;

namespace ToeicMind.Controllers;

/// <summary>Admin xem và xử lý báo lỗi nội dung của người học. Chỉ ADMIN.</summary>
[Route("api/admin/reports")]
[Authorize(Roles = "ADMIN")]
public class AdminReportsController : ApiControllerBase
{
    private readonly IReportService _reports;
    public AdminReportsController(IReportService reports) => _reports = reports;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] ReportListRequestDto query) => Ok(await _reports.ListAllAsync(query));

    /// <summary>Đổi trạng thái (IN_PROGRESS, RESOLVED, REJECTED) và ghi chú xử lý.</summary>
    [HttpPut("{id:int:min(1)}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateReportRequestDto dto) =>
        Respond(await _reports.UpdateAsync(id, UserId, dto));
}
