using System.Net;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToeicMind.DTOs.Vip.Request;
using ToeicMind.Services.Vip;

namespace ToeicMind.Controllers;

/// <summary>
/// API nâng cấp VIP qua VNPay. Công khai: danh sách gói, return URL và IPN của VNPay (xác thực bằng chữ ký HMAC, không bằng token).
/// Cần đăng nhập: trạng thái VIP, mua gói, lịch sử đơn của mình.
/// </summary>
[Route("api/vip")]
[Authorize]
public class VipController : ApiControllerBase
{
    private readonly IVipService _vip;
    public VipController(IVipService vip) => _vip = vip;

    /// <summary>Các gói VIP đang bán (giá VND, thời hạn).</summary>
    [AllowAnonymous, HttpGet("plans")]
    public async Task<IActionResult> Plans() => Ok(await _vip.ListPlansAsync(true));

    /// <summary>Trạng thái VIP của tôi: còn hạn không, hết hạn khi nào, số ngày còn lại. ADMIN luôn có toàn quyền.</summary>
    [HttpGet("me")]
    public async Task<IActionResult> Me() => Ok(await _vip.GetStatusAsync(UserId));

    /// <summary>Tạo đơn mua gói VIP và nhận paymentUrl; chuyển trình duyệt tới đó để thanh toán trên VNPay.</summary>
    /// <summary>Lịch sử VIP của chính mình: mua gói, được quản trị viên tặng hoặc thu hồi (không kèm lý do nội bộ).</summary>
    [HttpGet("history"), VipHistorySchemaFilter]
    public async Task<IActionResult> History() => Ok(await _vip.ListHistoryAsync(UserId));

    [HttpPost("orders")]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequestDto dto) =>
        Respond(await _vip.CreateOrderAsync(UserId, dto, ClientIp()), StatusCodes.Status201Created);

    /// <summary>Lịch sử đơn thanh toán của tôi (mới nhất trước).</summary>
    [HttpGet("orders")]
    public async Task<IActionResult> MyOrders([FromQuery] OrderListRequestDto query) => Ok(await _vip.ListOrdersAsync(query, UserId));

    /// <summary>Một đơn của tôi (để trang kết quả hiển thị trạng thái).</summary>
    [HttpGet("orders/{id:int:min(1)}")]
    public async Task<IActionResult> Order(int id) => Respond(await _vip.GetOrderAsync(UserId, id));

    /// <summary>
    /// VNPay đưa trình duyệt về đây sau khi thanh toán (vnp_ReturnUrl). Xác thực chữ ký, chốt đơn (idempotent) rồi chuyển hướng
    /// về trang kết quả của frontend kèm ?txnRef=&amp;status=PAID|FAILED|INVALID|NOT_FOUND. Không có FrontendResultUrl thì trả JSON.
    /// </summary>
    [AllowAnonymous, HttpGet("vnpay-return")]
    public async Task<IActionResult> VnPayReturn()
    {
        var (outcome, order) = await _vip.ConfirmPaymentAsync(VnPayQuery());
        var status = outcome switch
        {
            VnPayOutcome.Paid or VnPayOutcome.Failed or VnPayOutcome.AlreadyConfirmed => order!.Status,
            VnPayOutcome.OrderNotFound => "NOT_FOUND",
            _ => "INVALID"
        };
        var target = _vip.FrontendResultUrl;
        if (string.IsNullOrWhiteSpace(target)) return Ok(new { status, order });
        var separator = target.Contains('?') ? '&' : '?';
        return Redirect($"{target}{separator}status={status}" + (order is null ? "" : $"&txnRef={Uri.EscapeDataString(order.TxnRef)}"));
    }

    /// <summary>VNPay gọi máy chủ (IPN) để báo kết quả. Phản hồi đúng định dạng của VNPay: { RspCode, Message }. Cần URL công khai khai báo trong Merchant Admin.</summary>
    [AllowAnonymous, HttpGet("vnpay-ipn")]
    public async Task<IActionResult> VnPayIpn()
    {
        var (outcome, _) = await _vip.ConfirmPaymentAsync(VnPayQuery());
        var (code, message) = outcome switch
        {
            VnPayOutcome.Paid or VnPayOutcome.Failed => ("00", "Confirm Success"),
            VnPayOutcome.AlreadyConfirmed => ("02", "Order already confirmed"),
            VnPayOutcome.OrderNotFound => ("01", "Order not found"),
            VnPayOutcome.AmountMismatch => ("04", "Invalid amount"),
            _ => ("97", "Invalid signature")
        };
        // Từ điển giữ nguyên tên khóa (RspCode/Message) mà VNPay yêu cầu, không bị đổi sang camelCase.
        return Ok(new Dictionary<string, string> { ["RspCode"] = code, ["Message"] = message });
    }

    private Dictionary<string, string> VnPayQuery() => Request.Query.ToDictionary(q => q.Key, q => q.Value.ToString());

    // VNPay cần IPv4; kết nối local (::1) gửi 127.0.0.1.
    private string ClientIp()
    {
        var ip = HttpContext.Connection.RemoteIpAddress;
        if (ip is null || IPAddress.IsLoopback(ip)) return "127.0.0.1";
        return ip.IsIPv4MappedToIPv6 ? ip.MapToIPv4().ToString() : ip.ToString();
    }
}
