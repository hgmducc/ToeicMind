using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ToeicMind.DTOs.Vip.Request;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class CreateOrderRequestDto
{
    /// <summary>Mã gói VIP (VipPlan.Code), lấy từ GET /api/vip/plans.</summary>
    [Required, MaxLength(30)]
    public string PlanCode { get; set; } = string.Empty;
}