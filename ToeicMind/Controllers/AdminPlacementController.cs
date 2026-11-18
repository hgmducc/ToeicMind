using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToeicMind.Services.Learning;

namespace ToeicMind.Controllers;

/// <summary>
/// API quản trị bài kiểm tra đầu vào (CHG-007): ghép bài từ các nhóm câu của đề đã xuất bản, gợi ý tự động theo số câu mỗi Part,
/// đặt thời gian và bật một bài cho người học. Chỉ ADMIN.
/// </summary>
[Route("api/admin/placement-tests")]
[Authorize(Roles = "ADMIN")]
[PersonalizationSchemaFilter]
public class AdminPlacementController : ApiControllerBase
{
    private readonly IPlacementService _placement;
    public AdminPlacementController(IPlacementService placement) => _placement = placement;

    /// <summary>Các bài kiểm tra (bài đang dùng đứng đầu) kèm số câu theo Part và số lượt đã làm.</summary>
    [HttpGet]
    public async Task<IActionResult> List() => Ok(await _placement.ListAsync());

    /// <summary>Chi tiết một bài kèm các nhóm câu theo thứ tự làm bài (nhóm đã bị xóa sau khi chọn có IsAvailable = false).</summary>
    [HttpGet("{id:int:min(1)}")]
    public async Task<IActionResult> Get(int id) => Respond(await _placement.GetAsync(id));

    [HttpPost]
    public async Task<IActionResult> Create(SavePlacementTestRequestDto dto) =>
        Respond(await _placement.SaveAsync(UserId, null, dto), StatusCodes.Status201Created);

    /// <summary>Sửa bài (thay toàn bộ danh sách nhóm). Lượt đã làm giữ nguyên câu hỏi và kết quả cũ.</summary>
    [HttpPut("{id:int:min(1)}")]
    public async Task<IActionResult> Update(int id, SavePlacementTestRequestDto dto) => Respond(await _placement.SaveAsync(UserId, id, dto));

    /// <summary>Xóa mềm (tự tắt nếu đang dùng). Kết quả người học đã làm vẫn được giữ.</summary>
    [HttpDelete("{id:int:min(1)}")]
    public async Task<IActionResult> Delete(int id) => Respond(await _placement.DeleteAsync(id));

    /// <summary>Nhóm câu ứng viên (đề đã xuất bản), lọc theo Part, đề, Level, phân loại (gồm loại con), từ khóa.</summary>
    [HttpGet("candidates")]
    public async Task<IActionResult> Candidates([FromQuery] PlacementCandidateRequestDto query) => Ok(await _placement.SearchCandidatesAsync(query));

    /// <summary>Gợi ý bộ nhóm theo số câu mỗi Part (trải đều Level, đa dạng chủ điểm) và thời gian đề xuất. Không lưu.</summary>
    [HttpPost("generate")]
    public async Task<IActionResult> Generate(GeneratePlacementRequestDto dto) => Respond(await _placement.GenerateAsync(dto));
}
