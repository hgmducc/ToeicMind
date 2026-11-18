using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToeicMind.DTOs.Exams.Request;
using ToeicMind.Services.Exams;

namespace ToeicMind.Controllers;

/// <summary>API quản trị hướng dẫn dùng chung: xem, nạp mặc định, tạo, sửa. Chỉ ADMIN.</summary>
[Route("api/admin/directions")]
[Authorize(Roles = "ADMIN")]
public class AdminExamDirectionsController : ApiControllerBase
{
    private readonly IExamContentService _content;
    public AdminExamDirectionsController(IExamContentService content) => _content = content;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery, Range(1, int.MaxValue)] int? examId, [FromQuery] bool effective = false) =>
        Ok(await _content.GetDirectionsAsync(examId, effective));

    /// <summary>
    /// Seed 9 hướng dẫn mặc định (2 SECTION + 7 PART) vào database nếu chưa có.
    /// Idempotent: gọi lại không ghi đè bản ghi đã tồn tại.
    /// </summary>
    [HttpPost("seed")]
    public async Task<IActionResult> SeedDefaults()
    {
        var (inserted, directions) = await _content.SeedDefaultDirectionsAsync();
        return Ok(new { inserted, total = directions.Count, directions });
    }

    [HttpPost]
    public async Task<IActionResult> Create(SaveDirectionRequestDto dto) =>
        Respond(await _content.SaveDirectionAsync(null, dto), StatusCodes.Status201Created);

    [HttpPut("{id:int:min(1)}")]
    public async Task<IActionResult> Update(int id, SaveDirectionRequestDto dto) =>
        Respond(await _content.SaveDirectionAsync(id, dto));
}
