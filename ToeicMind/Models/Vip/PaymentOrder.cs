using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace ToeicMind.Models.Vip;

/// <summary>Trạng thái đơn thanh toán (khớp CHECK trong database).</summary>
public static class OrderStatus
{
    public const string Pending = "PENDING";
    public const string Paid = "PAID";
    public const string Failed = "FAILED";
}

/// <summary>Một đơn mua gói VIP qua VNPay. Gói, giá và thời hạn được chụp lại lúc mua.</summary>
[Table("PaymentOrder", Schema = "dbo")]
[Index(nameof(TxnRef), IsUnique = true, Name = "UQ_PaymentOrder_TxnRef")]
public class PaymentOrder
{
    [Key]
    public int OrderId { get; set; }
    public int UserId { get; set; }
    public int PlanId { get; set; }

    [MaxLength(30), Column(TypeName = "varchar(30)")]
    public string PlanCode { get; set; } = string.Empty;

    [MaxLength(100)]
    public string PlanName { get; set; } = string.Empty;

    public int DurationDays { get; set; }

    /// <summary>Số tiền VND.</summary>
    public int Amount { get; set; }

    [MaxLength(10), Column(TypeName = "varchar(10)")]
    public string Provider { get; set; } = "VNPAY";

    /// <summary>Mã tham chiếu gửi sang VNPay (vnp_TxnRef), duy nhất.</summary>
    [MaxLength(40), Column(TypeName = "varchar(40)")]
    public string TxnRef { get; set; } = string.Empty;

    [MaxLength(10), Column(TypeName = "varchar(10)")]
    public string Status { get; set; } = OrderStatus.Pending;

    [MaxLength(5), Column(TypeName = "varchar(5)")]
    public string? ResponseCode { get; set; }

    [MaxLength(30), Column(TypeName = "varchar(30)")]
    public string? TransactionNo { get; set; }

    [MaxLength(20), Column(TypeName = "varchar(20)")]
    public string? BankCode { get; set; }

    [MaxLength(20), Column(TypeName = "varchar(20)")]
    public string? CardType { get; set; }

    [MaxLength(45), Column(TypeName = "varchar(45)")]
    public string? IpAddress { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    [ForeignKey(nameof(UserId)), DeleteBehavior(DeleteBehavior.NoAction)]
    public Users User { get; set; } = null!;
}
