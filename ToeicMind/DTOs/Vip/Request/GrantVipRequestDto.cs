using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ToeicMind.DTOs.Vip.Request;

/// <summary>
/// Quản trị viên điều chỉnh VIP của một người dùng và để lại lý do (ghi vào VipHistory, không tạo đơn thanh toán).
/// GRANT: cộng thêm Days ngày, tính nối tiếp từ thời hạn hiện tại nếu còn VIP (không làm mất ngày người dùng đã mua).
/// REVOKE: kết thúc VIP ngay. Không còn cho đặt thẳng ngày hết hạn (trường ExpiresAt cũ bị từ chối với 400).
/// </summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class GrantVipRequestDto
{
    /// <summary>GRANT hoặc REVOKE.</summary>
    [Required(ErrorMessage = "Thiếu thao tác (GRANT hoặc REVOKE)")]
    public string Action { get; set; } = string.Empty;

    /// <summary>Số ngày cộng thêm (1–3660), bắt buộc với GRANT.</summary>
    [Range(1, 3660, ErrorMessage = "Số ngày phải từ 1 đến 3660")]
    public int? Days { get; set; }

    /// <summary>Lý do (bắt buộc, tối đa 300 ký tự), ví dụ "Bù lỗi thanh toán", "Tặng sự kiện".</summary>
    [Required(ErrorMessage = "Vui lòng nhập lý do")]
    [MaxLength(300, ErrorMessage = "Lý do không được vượt quá 300 ký tự")]
    public string Reason { get; set; } = string.Empty;
}
