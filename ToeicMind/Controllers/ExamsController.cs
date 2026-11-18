using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToeicMind.DTOs.Exams.Request;
using ToeicMind.Services.Exams;
using ToeicMind.Services.Learning;

namespace ToeicMind.Controllers;

/// <summary>
/// API đề thi cho người học. Công khai (khách xem được): danh sách bộ đề, danh sách đề, danh mục, cấu trúc đề và chế độ làm bài.
/// Cần đăng nhập: nội dung làm bài. Vào đề tách nhỏ: modes → directions → từng Part (chữ) → media.
/// </summary>
[Route("api")]
[Authorize]
public class ExamsController : ApiControllerBase
{
    private readonly IExamService _exams;
    private readonly IExamContentService _content;
    private readonly IExamPlayService _play;

    public ExamsController(IExamService exams, IExamContentService content, IExamPlayService play)
    {
        _exams = exams;
        _content = content;
        _play = play;
    }

    /// <summary>Các bộ đề có đề đã xuất bản kèm số đề.</summary>
    [AllowAnonymous, HttpGet("exam-sets")]
    public async Task<IActionResult> Sets([FromQuery] ExamPageRequestDto query) =>
        Ok(await _exams.ListSetsAsync(query, true));

    /// <summary>Danh mục dùng chung của đề: Part, mức độ, phân loại câu, cờ đặc biệt.</summary>
    [AllowAnonymous, HttpGet("exam-catalogs")]
    public async Task<IActionResult> Catalog() => Ok(await _content.GetCatalogAsync());

    /// <summary>Các đề đã xuất bản, lọc theo bộ đề (examSetId) và từ khóa.</summary>
    [AllowAnonymous, HttpGet("exams")]
    public async Task<IActionResult> List([FromQuery] ExamBrowseRequestDto query) =>
        Ok(await _exams.ListExamsAsync(query, true, viewerId: UserIdOrNull));

    /// <summary>
    /// Cấu trúc đề và dữ liệu cho hộp "Chọn chế độ": Luyện thi (trọn đề 120 phút, Nghe 45 phút, Đọc 75 phút, hoặc chọn nhiều Part với thời gian đề xuất/tự đặt)
    /// và Luyện tập (tất cả Part hoặc Part bất kỳ). Mỗi Part kèm số câu và dàn ý nhóm (có audio/hình), không có chữ câu hỏi. Có ETag (If-None-Match → 304).
    /// </summary>
    [AllowAnonymous, HttpGet("exams/{id:int:min(1)}/modes")]
    public async Task<IActionResult> Modes(int id) => Play(await _play.GetModesAsync(id, IfNoneMatch()));

    /// <summary>Hướng dẫn hiệu lực của đề (phần thi và từng Part) kèm audio hướng dẫn nếu có.</summary>
    [HttpGet("exams/{id:int:min(1)}/directions")]
    public async Task<IActionResult> Directions(int id) => Play(await _play.GetDirectionsAsync(UserId, id, IfNoneMatch()));

    /// <summary>
    /// Nội dung một Part để làm bài (không có đáp án đúng, giải thích, transcript).
    /// media=false chỉ trả chữ (nhanh nhất, có ETag); media=true (mặc định) kèm link audio/hình đã ký.
    /// </summary>
    [HttpGet("exams/{id:int:min(1)}/parts/{partNo:int:range(1,7)}")]
    public async Task<IActionResult> Part(int id, byte partNo, [FromQuery] bool media = true) =>
        Play(await _play.GetPartAsync(UserId, id, partNo, media, IfNoneMatch()));

    /// <summary>Chỉ link media đã ký của một Part, nhóm theo nhóm câu hỏi. Dùng để tải media sau chữ hoặc làm mới link hết hạn.</summary>
    [HttpGet("exams/{id:int:min(1)}/parts/{partNo:int:range(1,7)}/media")]
    public async Task<IActionResult> PartMedia(int id, byte partNo) => Play(await _play.GetPartMediaAsync(UserId, id, partNo));

    private string? IfNoneMatch() => Request.Headers.IfNoneMatch.ToString() is { Length: > 0 } value ? value : null;

    private IActionResult Play<T>(PlayResult<T> result)
    {
        if (result.Error is not null) return Fail(result.Error);
        // no-cache = luôn hỏi lại máy chủ (rẻ nhờ cache RAM + 304), tránh dùng bản cũ sau khi đề đổi.
        Response.Headers.CacheControl = "private, no-cache";
        if (result.ETag is not null) Response.Headers.ETag = result.ETag;
        return result.NotModified ? StatusCode(StatusCodes.Status304NotModified) : Ok(result.Value);
    }
}
