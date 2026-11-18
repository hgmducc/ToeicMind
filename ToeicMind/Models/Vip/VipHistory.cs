using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ToeicMind.Models.Vip;

/// <summary>Loại thay đổi thời hạn VIP (khớp CHECK CK_VipHistory_Kind trong database).</summary>
public static class VipHistoryKind
{
    /// <summary>Mua gói qua VNPay (gắn với đơn thanh toán).</summary>
    public const string Purchase = "PURCHASE";
    /// <summary>Quản trị viên tặng/gia hạn VIP (không phát sinh thanh toán).</summary>
    public const string AdminGrant = "ADMIN_GRANT";
    /// <summary>Quản trị viên thu hồi VIP.</summary>
    public const string AdminRevoke = "ADMIN_REVOKE";
}

/// <summary>
/// Nhật ký mọi thay đổi thời hạn VIP của một người dùng. Tách khỏi PaymentOrder: VIP do quản trị viên cấp
/// không phải giao dịch thanh toán nên không tạo đơn 0đ. Lý do và người thực hiện chỉ quản trị viên xem được.
/// </summary>
[Table("VipHistory", Schema = "dbo")]
public class VipHistory
{
    [Key]
    public long HistoryId { get; set; }
    public int UserId { get; set; }

    [MaxLength(20), Column(TypeName = "varchar(20)")]
    public string Kind { get; set; } = VipHistoryKind.AdminGrant;

    /// <summary>Số ngày được cộng (mua gói hoặc quản trị viên tặng); null khi thu hồi.</summary>
    public int? Days { get; set; }
    public DateTime? PreviousExpiresAt { get; set; }
    public DateTime? NewExpiresAt { get; set; }

    /// <summary>Đơn thanh toán (chỉ với PURCHASE).</summary>
    public int? OrderId { get; set; }

    /// <summary>Quản trị viên thực hiện (chỉ với ADMIN_*).</summary>
    public int? ActorUserId { get; set; }

    /// <summary>Lý do của quản trị viên (bắt buộc với ADMIN_*); không trả cho người học.</summary>
    [MaxLength(300)]
    public string? Reason { get; set; }

    public DateTime CreatedAt { get; set; }
}
