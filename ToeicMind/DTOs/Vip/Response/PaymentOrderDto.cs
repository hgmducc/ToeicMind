namespace ToeicMind.DTOs.Vip.Response;

public class PaymentOrderDto
{
    public int OrderId { get; set; }
    public int UserId { get; set; }
    public string? UserEmail { get; set; }
    public string PlanCode { get; set; } = string.Empty;
    public string PlanName { get; set; } = string.Empty;
    public int DurationDays { get; set; }
    public int Amount { get; set; }
    public string TxnRef { get; set; } = string.Empty;
    /// <summary>PENDING (chờ thanh toán), PAID (đã cộng VIP), FAILED (thất bại/hủy).</summary>
    public string Status { get; set; } = string.Empty;
    public string? ResponseCode { get; set; }
    public string? TransactionNo { get; set; }
    public string? BankCode { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? PaidAt { get; set; }
}