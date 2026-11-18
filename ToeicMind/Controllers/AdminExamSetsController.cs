using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToeicMind.DTOs.Exams.Request;
using ToeicMind.Services.Exams;

namespace ToeicMind.Controllers;

/// <summary>API quản trị bộ đề (ExamSet): danh sách, tạo, sửa, xóa mềm, khôi phục. Chỉ ADMIN.</summary>
[Route("api/admin/exam-sets")]
[Authorize(Roles = "ADMIN")]
public class AdminExamSetsController : ApiControllerBase
{
    private readonly IExamService _exams;
    public AdminExamSetsController(IExamService exams) => _exams = exams;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] ExamSetListRequestDto query) =>
        Ok(await _exams.ListSetsAsync(query, false, query.IsDeleted));

    [HttpPost]
    public async Task<IActionResult> Create(SaveExamSetRequestDto dto) =>
        Respond(await _exams.SaveSetAsync(null, dto, UserId), StatusCodes.Status201Created);

    [HttpPut("{id:int:min(1)}")]
    public async Task<IActionResult> Update(int id, SaveExamSetRequestDto dto) =>
        Respond(await _exams.SaveSetAsync(id, dto, UserId));

    [HttpDelete("{id:int:min(1)}")]
    public async Task<IActionResult> Delete(int id)
    {
        var error = await _exams.SetDeletedAsync(id, true);
        if (error != "EXAM_SET_NOT_EMPTY") return Respond(error);

        // Kèm danh sách đề còn lại để người dùng biết cần xóa hoặc chuyển đề nào.
        var exams = await _exams.ListExamsAsync(new ExamBrowseRequestDto { ExamSetId = id }, false);
        return Conflict(new { code = error, message = "Bộ còn đề chưa xóa. Hãy xóa hoặc chuyển đề trước.", exams, traceId = HttpContext.TraceIdentifier });
    }

    [HttpPost("{id:int:min(1)}/restore")]
    public async Task<IActionResult> Restore(int id)
    {
        var error = await _exams.SetDeletedAsync(id, false);
        return error is not null ? Fail(error) : Ok(await _exams.GetSetAsync(id, false));
    }
}
