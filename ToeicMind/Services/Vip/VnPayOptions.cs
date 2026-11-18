namespace ToeicMind.Services.Vip;

/// <summary>Cấu hình cổng thanh toán VNPay (section "VnPay"). Khóa/secret đặt trong .env hoặc secret của nơi triển khai, không commit.</summary>
public class VnPayOptions
{
    public string TmnCode { get; set; } = string.Empty;
    public string HashSecret { get; set; } = string.Empty;

    /// <summary>Sandbox: https://sandbox.vnpayment.vn/paymentv2/vpcpay.html; Production: https://pay.vnpay.vn/vpcpay.html.</summary>
    public string PaymentUrl { get; set; } = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

    /// <summary>URL backend VNPay chuyển trình duyệt về sau khi thanh toán (GET /api/vip/vnpay-return).</summary>
    public string ReturnUrl { get; set; } = string.Empty;

    /// <summary>Trang của frontend Người học hiển thị kết quả; backend chuyển hướng về đây kèm ?txnRef=&amp;status=.</summary>
    public string FrontendResultUrl { get; set; } = string.Empty;

    /// <summary>Thời gian giữ đơn chờ thanh toán (phút).</summary>
    public int OrderExpireMinutes { get; set; } = 15;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(TmnCode) && !string.IsNullOrWhiteSpace(HashSecret) &&
                                !string.IsNullOrWhiteSpace(ReturnUrl) && !string.IsNullOrWhiteSpace(PaymentUrl);
}
