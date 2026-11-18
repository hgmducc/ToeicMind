using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ToeicMind.DTOs.Vip.Request;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class SaveVipPlanRequestDto
{
    [Required, MaxLength(30), RegularExpression(@"[A-Za-z0-9][A-Za-z0-9_-]*", ErrorMessage = "Mã gói chỉ gồm chữ, số, gạch dưới và gạch ngang")]
    public string Code { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    [Range(1, 3660)]
    public int DurationDays { get; set; }

    /// <summary>Giá VND; VNPay yêu cầu tối thiểu 5.000đ.</summary>
    [Range(5000, 100000000)]
    public int PriceVnd { get; set; }

    public bool IsActive { get; set; } = true;

    [Range(0, 1000)]
    public short SortOrder { get; set; }
}