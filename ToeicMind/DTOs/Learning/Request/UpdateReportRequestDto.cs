using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ToeicMind.DTOs.Learning.Request;

/// <summary>Admin xử lý báo cáo: đổi trạng thái và ghi chú.</summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class UpdateReportRequestDto
{
    [Required, RegularExpression("^(IN_PROGRESS|RESOLVED|REJECTED)$", ErrorMessage = "Status chỉ nhận IN_PROGRESS, RESOLVED hoặc REJECTED")]
    public string Status { get; set; } = string.Empty;
    [MaxLength(1000)]
    public string? AdminNote { get; set; }
}
