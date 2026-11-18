using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToeicMind.DTOs.Vip.Request;
using ToeicMind.Services.Vip;

namespace ToeicMind.Controllers;

/// <summary>API quản trị VIP: gói bán, đơn thanh toán, cấp/thu hồi VIP thủ công. Chỉ ADMIN. Quyền miễn phí/VIP của bộ đề đặt ở API bộ đề/đề.</summary>
[Route("api/admin/vip")]
[Authorize(Roles = "ADMIN")]
public class AdminVipController : ApiControllerBase
{
    private readonly IVipService _vip;
    public AdminVipController(IVipService vip) => _vip = vip;

    /// <summary>Mọi gói (kể cả đang tắt).</summary>
    [HttpGet("plans")]
    public async Task<IActionResult> Plans() => Ok(await _vip.ListPlansAsync(false));

    [HttpPost("plans")]
    public async Task<IActionResult> CreatePlan(SaveVipPlanRequestDto dto) => Respond(await _vip.SavePlanAsync(null, dto), StatusCodes.Status201Created);

    [HttpPut("plans/{id:int:min(1)}")]
    public async Task<IActionResult> UpdatePlan(int id, SaveVipPlanRequestDto dto) => Respond(await _vip.SavePlanAsync(id, dto));

    /// <summary>Đơn thanh toán của mọi người dùng; lọc theo Status, UserId.</summary>
    [HttpGet("orders")]
    public async Task<IActionResult> Orders([FromQuery] OrderListRequestDto query) => Ok(await _vip.ListOrdersAsync(query, null));

    /// <summary>
    /// Cộng thêm ngày VIP (GRANT, nối tiếp hạn hiện tại) hoặc thu hồi (REVOKE) cho một người dùng, bắt buộc có lý do.
    /// Ghi vào lịch sử VIP (không tạo đơn thanh toán). Trả dòng lịch sử vừa ghi.
    /// </summary>
    [HttpPut("users/{userId:int:min(1)}"), VipHistorySchemaFilter]
    public async Task<IActionResult> Grant(int userId, GrantVipRequestDto dto) => Respond(await _vip.GrantVipAsync(UserId, userId, dto));

    /// <summary>Lịch sử VIP của một người dùng (mua gói, được tặng, bị thu hồi) kèm lý do và quản trị viên thực hiện.</summary>
    [HttpGet("users/{userId:int:min(1)}/history"), VipHistorySchemaFilter]
    public async Task<IActionResult> History(int userId) => Ok(await _vip.ListHistoryForAdminAsync(userId));
}
