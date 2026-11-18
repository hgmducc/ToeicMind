using System.Net;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;

namespace ToeicMind.Services.Vip;

/// <summary>Tạo URL thanh toán VNPay (v2.1.0) và kiểm tra chữ ký HMAC-SHA512 của phản hồi (return URL và IPN).</summary>
public class VnPayClient
{
    private const string SecureHash = "vnp_SecureHash";
    private const string SecureHashType = "vnp_SecureHashType";

    private readonly VnPayOptions _options;
    public VnPayClient(IOptions<VnPayOptions> options) => _options = options.Value;

    public bool IsConfigured => _options.IsConfigured;

    /// <summary>URL chuyển người dùng sang cổng VNPay. amountVnd là số tiền VND (VNPay yêu cầu nhân 100).</summary>
    public string BuildPaymentUrl(string txnRef, int amountVnd, string orderInfo, string ipAddress, DateTime createdUtc, DateTime expiresUtc)
    {
        var data = new Dictionary<string, string>
        {
            ["vnp_Version"] = "2.1.0",
            ["vnp_Command"] = "pay",
            ["vnp_TmnCode"] = _options.TmnCode,
            ["vnp_Amount"] = ((long)amountVnd * 100).ToString(),
            ["vnp_CreateDate"] = Vietnam(createdUtc),
            ["vnp_CurrCode"] = "VND",
            ["vnp_IpAddr"] = ipAddress,
            ["vnp_Locale"] = "vn",
            ["vnp_OrderInfo"] = orderInfo,
            ["vnp_OrderType"] = "other",
            ["vnp_ReturnUrl"] = _options.ReturnUrl,
            ["vnp_TxnRef"] = txnRef,
            ["vnp_ExpireDate"] = Vietnam(expiresUtc)
        };
        var query = Canonical(data);
        return $"{_options.PaymentUrl}?{query}&{SecureHash}={Sign(query)}";
    }

    /// <summary>Chữ ký hợp lệ khi HMAC-SHA512 của các tham số vnp_* (đã sắp xếp, trừ vnp_SecureHash) khớp vnp_SecureHash.</summary>
    public bool VerifySignature(IReadOnlyDictionary<string, string> query)
    {
        if (!_options.IsConfigured || !query.TryGetValue(SecureHash, out var received) || string.IsNullOrWhiteSpace(received)) return false;
        var expected = Encoding.ASCII.GetBytes(Sign(Canonical(query)));
        return CryptographicOperations.FixedTimeEquals(expected, Encoding.ASCII.GetBytes(received.Trim().ToLowerInvariant()));
    }

    // VNPay dùng giờ Việt Nam (GMT+7), định dạng yyyyMMddHHmmss.
    private static string Vietnam(DateTime utc) => utc.AddHours(7).ToString("yyyyMMddHHmmss");

    // Chỉ tham số vnp_* có giá trị, bỏ chữ ký, sắp theo tên (ordinal), mã hóa URL; dùng cho cả ký và query string.
    private static string Canonical(IEnumerable<KeyValuePair<string, string>> parameters) =>
        string.Join('&', parameters
            .Where(p => p.Key.StartsWith("vnp_", StringComparison.Ordinal) && p.Key is not SecureHash and not SecureHashType && !string.IsNullOrEmpty(p.Value))
            .OrderBy(p => p.Key, StringComparer.Ordinal)
            .Select(p => $"{WebUtility.UrlEncode(p.Key)}={WebUtility.UrlEncode(p.Value)}"));

    private string Sign(string data)
    {
        using var hmac = new HMACSHA512(Encoding.UTF8.GetBytes(_options.HashSecret));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(data))).ToLowerInvariant();
    }
}
