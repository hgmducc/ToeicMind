namespace ToeicMind.DTOs.Vip.Response;

/// <summary>Một dòng "Lịch sử VIP" người học xem được (GET /api/vip/history). Không có lý do hay người thực hiện.</summary>
public class VipHistoryItemDto
{
    public long HistoryId { get; set; }
    /// <summary>PURCHASE (mua gói), ADMIN_GRANT (được tặng), ADMIN_REVOKE (bị thu hồi).</summary>
    public string Kind { get; set; } = string.Empty;
    public int? Days { get; set; }
    public DateTime? PreviousExpiresAt { get; set; }
    public DateTime? NewExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
    /// <summary>Chỉ với PURCHASE: gói, số tiền (VND) và mã giao dịch của đơn.</summary>
    public string? PlanName { get; set; }
    public int? Amount { get; set; }
    public string? TxnRef { get; set; }
}

/// <summary>Dòng lịch sử VIP cho quản trị viên: thêm lý do và người thực hiện.</summary>
public class AdminVipHistoryItemDto : VipHistoryItemDto
{
    public string? Reason { get; set; }
    public int? ActorUserId { get; set; }
    public string? ActorName { get; set; }
}
