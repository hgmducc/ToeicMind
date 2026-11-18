using System.ComponentModel.DataAnnotations;

namespace ToeicMind.DTOs.Vip.Request;

/// <summary>Phân trang và lọc đơn thanh toán (Admin có thể lọc theo UserId).</summary>
public class OrderListRequestDto
{
    [Range(1, 1000000)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 20;

    [RegularExpression("^(PENDING|PAID|FAILED)$")]
    public string? Status { get; set; }

    [Range(1, int.MaxValue)]
    public int? UserId { get; set; }
}