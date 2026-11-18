namespace ToeicMind.DTOs.Vip.Response;

/// <summary>Đơn vừa tạo: chuyển trình duyệt tới PaymentUrl (VNPay) để thanh toán.</summary>
public class CreateOrderResultDto
{
    public int OrderId { get; set; }
    public string TxnRef { get; set; } = string.Empty;
    public int Amount { get; set; }
    public string PaymentUrl { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}