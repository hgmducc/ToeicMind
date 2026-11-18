using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToeicMind.DTOs.Listening.Request;
using ToeicMind.Services.Listening;

namespace ToeicMind.Controllers;

/// <summary>
/// UC-28 TH2: Admin quản lý bộ clip sưu tầm (không thuộc đề) cho Nghe chép. Bộ clip cắt từ đề (TH1) đi theo nội dung đề và media của đề.
/// Nghe thử/xóa audio của clip dùng /api/admin/media/{id}/url và DELETE /api/admin/media/{id}. Chỉ ADMIN.
/// </summary>
[Route("api/admin/listening-items")]
[Authorize(Roles = "ADMIN")]
public class AdminListeningItemsController : ApiControllerBase
{
    private const int MaxUploadBytes = 50 * 1024 * 1024;

    private readonly IListeningItemService _items;
    public AdminListeningItemsController(IListeningItemService items) => _items = items;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] ListeningItemListRequestDto query) => Ok(await _items.ListAsync(query));

    [HttpGet("{id:int:min(1)}")]
    public async Task<IActionResult> Get(int id) => Respond(await _items.GetAsync(id));

    [HttpPost]
    public async Task<IActionResult> Create(SaveListeningItemRequestDto dto) => Respond(await _items.SaveAsync(null, dto), StatusCodes.Status201Created);

    [HttpPut("{id:int:min(1)}")]
    public async Task<IActionResult> Update(int id, SaveListeningItemRequestDto dto) => Respond(await _items.SaveAsync(id, dto));

    /// <summary>Xuất bản (cần loại bài, Level và ít nhất một clip) hoặc ẩn bộ clip.</summary>
    [HttpPut("{id:int:min(1)}/status")]
    public async Task<IActionResult> Status(int id, ListeningItemStatusRequestDto dto) => Respond(await _items.SetPublishedAsync(id, dto.IsPublished!.Value));

    [HttpDelete("{id:int:min(1)}")]
    public async Task<IActionResult> Delete(int id) => Respond(await _items.SetDeletedAsync(id, true));

    [HttpPost("{id:int:min(1)}/restore")]
    public async Task<IActionResult> Restore(int id)
    {
        var error = await _items.SetDeletedAsync(id, false);
        return error is not null ? Fail(error) : Respond(await _items.GetAsync(id));
    }

    [HttpPost("{id:int:min(1)}/clips")]
    public async Task<IActionResult> AddClip(int id, SaveListeningClipRequestDto dto) =>
        Respond(await _items.SaveClipAsync(id, null, dto), StatusCodes.Status201Created);

    [HttpPut("{id:int:min(1)}/clips/{clipId:int:min(1)}")]
    public async Task<IActionResult> UpdateClip(int id, int clipId, SaveListeningClipRequestDto dto) => Respond(await _items.SaveClipAsync(id, clipId, dto));

    [HttpDelete("{id:int:min(1)}/clips/{clipId:int:min(1)}")]
    public async Task<IActionResult> DeleteClip(int id, int clipId) => Respond(await _items.DeleteClipAsync(id, clipId));

    /// <summary>Tải audio cho một clip (thay audio cũ nếu có).</summary>
    [HttpPost("{id:int:min(1)}/clips/{clipId:int:min(1)}/media")]
    [Consumes("multipart/form-data"), RequestSizeLimit(MaxUploadBytes), RequestFormLimits(MultipartBodyLengthLimit = MaxUploadBytes)]
    public async Task<IActionResult> UploadClipAudio(int id, int clipId, IFormFile file, CancellationToken cancellationToken) =>
        Respond(await _items.UploadClipAudioAsync(id, clipId, file, cancellationToken), StatusCodes.Status201Created);
}
