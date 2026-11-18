using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToeicMind.Services.Media;

namespace ToeicMind.Controllers;

/// <summary>API media của đề (audio/ảnh): upload, danh sách vị trí cần file, lấy link ký để nghe/xem, xóa. Chỉ ADMIN.</summary>
[Authorize(Roles = "ADMIN")]
public class AdminExamMediaController : ApiControllerBase
{
    private const int MaxUploadBytes = 50 * 1024 * 1024;

    private readonly IExamMediaService _media;
    public AdminExamMediaController(IExamMediaService media) => _media = media;

    [HttpPost("api/admin/exams/{examId:int:min(1)}/groups/{groupId:int:min(1)}/segments/{clipId:int:min(1)}/media")]
    [Consumes("multipart/form-data"), RequestSizeLimit(MaxUploadBytes), RequestFormLimits(MultipartBodyLengthLimit = MaxUploadBytes)]
    public async Task<IActionResult> UploadSegment(int examId, int groupId, int clipId, IFormFile file,
        [FromQuery, Required, MaxLength(100)] string fileName, CancellationToken cancellationToken) =>
        Respond(await _media.UploadAsync(examId, groupId, null, file, null, 1, cancellationToken, clipId, fileName), StatusCodes.Status201Created);

    // Vị trí cần tệp của đề, tên tệp đúng quy tắc và trạng thái đã tải; dùng để FE đối chiếu trước khi upload lên R2.
    [HttpGet("api/admin/exams/{examId:int:min(1)}/media-slots")]
    public async Task<IActionResult> Slots(int examId)
    {
        Response.Headers.CacheControl = "no-store";
        return Respond(await _media.GetSlotsAsync(examId));
    }

    [HttpPost("api/admin/exams/{examId:int:min(1)}/groups/{groupId:int:min(1)}/media")]
    [Consumes("multipart/form-data"), RequestSizeLimit(MaxUploadBytes), RequestFormLimits(MultipartBodyLengthLimit = MaxUploadBytes)]
    public async Task<IActionResult> UploadGroup(int examId, int groupId, IFormFile file, [FromQuery, Required, MaxLength(100)] string fileName,
        [FromQuery, MaxLength(300)] string? altText = null, [FromQuery, Range(1, 255)] byte sortOrder = 1, CancellationToken cancellationToken = default) =>
        Respond(await _media.UploadAsync(examId, groupId, null, file, altText, sortOrder, cancellationToken, null, fileName), StatusCodes.Status201Created);

    [HttpPost("api/admin/directions/{id:int:min(1)}/media")]
    [Consumes("multipart/form-data"), RequestSizeLimit(MaxUploadBytes), RequestFormLimits(MultipartBodyLengthLimit = MaxUploadBytes)]
    public async Task<IActionResult> UploadDirection(int id, IFormFile file, CancellationToken cancellationToken) =>
        Respond(await _media.UploadAsync(null, null, id, file, null, 1, cancellationToken), StatusCodes.Status201Created);

    [HttpGet("api/admin/media/{id:int:min(1)}/url")]
    public async Task<IActionResult> SignRead(int id)
    {
        Response.Headers.CacheControl = "no-store";
        return Respond(await _media.SignReadAsync(id));
    }

    [HttpDelete("api/admin/media/{id:int:min(1)}")]
    public async Task<IActionResult> Delete(int id) => Respond(await _media.DeleteAsync(id));
}
