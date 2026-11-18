using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToeicMind.DTOs.Exams.Request;
using ToeicMind.DTOs.Exams.Response;
using ToeicMind.Services.Exams;

namespace ToeicMind.Controllers;

/// <summary>
/// API quản trị đề thi (Exam), chỉ ADMIN: danh sách, chi tiết, tạo, sửa, xóa mềm, khôi phục; đọc nhóm câu hỏi cho trình biên soạn;
/// lưu cả đề từ trình biên soạn/Excel và xem lại dữ liệu nguồn; kiểm tra điều kiện, xuất bản và gỡ xuất bản.
/// </summary>
[Route("api/admin/exams")]
[Authorize(Roles = "ADMIN")]
public class AdminExamsController : ApiControllerBase
{
    private const int MaxContentBytes = 10 * 1024 * 1024;

    private readonly IExamService _exams;
    private readonly IExamContentService _content;

    public AdminExamsController(IExamService exams, IExamContentService content)
    {
        _exams = exams;
        _content = content;
    }

    // ---------- Đề thi ----------

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] ExamListRequestDto query) =>
        Ok(await _exams.ListExamsAsync(query, false, query.Status, query.IsDeleted));

    [HttpGet("{id:int:min(1)}")]
    public async Task<IActionResult> Get(int id) =>
        await _exams.GetExamAsync(id, false) is { } exam ? Ok(exam) : Fail("EXAM_NOT_FOUND");

    [HttpPost]
    public async Task<IActionResult> Create(SaveExamRequestDto dto)
    {
        var (result, error) = await _exams.SaveExamAsync(null, dto, UserId);
        return error is not null ? Fail(error) : CreatedAtAction(nameof(Get), new { id = result!.ExamId }, result);
    }

    [HttpPut("{id:int:min(1)}")]
    public async Task<IActionResult> Update(int id, SaveExamRequestDto dto) =>
        Respond(await _exams.SaveExamAsync(id, dto, UserId));

    [HttpDelete("{id:int:min(1)}")]
    public async Task<IActionResult> Delete(int id) => Respond(await _exams.ExamDeletedAsync(id, true));

    [HttpPost("{id:int:min(1)}/restore")]
    public async Task<IActionResult> Restore(int id)
    {
        var error = await _exams.ExamDeletedAsync(id, false);
        return error is not null ? Fail(error) : Ok(await _exams.GetExamAsync(id, false));
    }

    // ---------- Nội dung đề ----------

    /// <summary>Các nhóm câu hỏi của đề (kèm câu hỏi, đáp án, media) cho trình biên soạn; partNo giới hạn một Part.</summary>
    [HttpGet("{id:int:min(1)}/groups")]
    public async Task<IActionResult> Groups(int id, [FromQuery, Range(1, 7)] byte? partNo) =>
        Respond(await _content.GetGroupsAsync(id, partNo));

    /// <summary>Tạo đề mới từ nội dung Excel/trình biên soạn (một giao dịch, lỗi thì chưa ghi dòng nào).</summary>
    [HttpPost("import"), RequestSizeLimit(MaxContentBytes)]
    public async Task<IActionResult> Import(SaveExamContentRequestDto dto) => SaveContent(null, await _content.SavePackageAsync(null, dto, UserId));

    /// <summary>Lưu lại toàn bộ nội dung của đề đã có.</summary>
    [HttpPut("{id:int:min(1)}/content"), RequestSizeLimit(MaxContentBytes)]
    public async Task<IActionResult> UpdateContent(int id, SaveExamContentRequestDto dto) => SaveContent(id, await _content.SavePackageAsync(id, dto, UserId));

    /// <summary>Dữ liệu nguồn (các sheet Excel) đã nhập của đề; 204 nếu chưa có.</summary>
    [HttpGet("{id:int:min(1)}/import-source")]
    public async Task<IActionResult> ImportSource(int id)
    {
        Response.Headers.CacheControl = "no-store";
        var source = await _content.GetImportSourceAsync(id);
        return source is null ? NoContent() : Content(source, "application/json");
    }

    private IActionResult SaveContent(int? examId, (ExamDto? Result, string? Error, List<ExamIssueDto> Issues) saved)
    {
        var (result, error, issues) = saved;
        if (issues.Count > 0) return BadRequest(new { code = error, message = "Dữ liệu nhập không hợp lệ; chưa ghi dòng nào.", errors = issues });
        if (error is not null) return Fail(error);
        return examId.HasValue ? Ok(result) : Created($"/api/admin/exams/{result!.ExamId}", result);
    }

    // ---------- Xuất bản ----------

    /// <summary>Kiểm tra đề có đủ điều kiện xuất bản không (chưa ghi gì).</summary>
    [HttpGet("{id:int:min(1)}/publish-check")]
    public async Task<IActionResult> PublishCheck(int id)
    {
        var issues = await _content.ValidatePublishAsync(id);
        return issues.Any(i => i.Code == "EXAM_NOT_FOUND") ? Fail("EXAM_NOT_FOUND") : Ok(new { isValid = issues.Count == 0, issues });
    }

    /// <summary>Đổi trạng thái đề: PUBLISHED (xuất bản, phải đủ điều kiện) hoặc DRAFT (gỡ về bản nháp).</summary>
    [HttpPut("{id:int:min(1)}/status")]
    public async Task<IActionResult> ChangeStatus(int id, ChangeExamStatusRequestDto dto) =>
        dto.Status == "DRAFT" ? await UnpublishAsync(id) : await PublishAsync(id);

    private async Task<IActionResult> PublishAsync(int id)
    {
        var issues = await _content.PublishAsync(id);
        if (issues.Any(i => i.Code == "EXAM_NOT_FOUND")) return Fail("EXAM_NOT_FOUND");
        if (issues.Any(i => i.Code == "CONCURRENT_CHANGE")) return Fail("CONCURRENT_CHANGE");
        return issues.Count == 0 ? Ok(new { examId = id, status = "PUBLISHED" })
            : BadRequest(new { code = "EXAM_PUBLICATION_INVALID", message = "Đề chưa đủ điều kiện xuất bản", errors = issues, traceId = HttpContext.TraceIdentifier });
    }

    private async Task<IActionResult> UnpublishAsync(int id)
    {
        var error = await _content.UnpublishAsync(id);
        return error is null ? Ok(new { examId = id, status = "DRAFT" }) : Fail(error);
    }
}
