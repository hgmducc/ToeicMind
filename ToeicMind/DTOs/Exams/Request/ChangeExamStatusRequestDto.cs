using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ToeicMind.DTOs.Exams.Request;

/// <summary>Trạng thái đích của đề: PUBLISHED (xuất bản, phải đủ điều kiện) hoặc DRAFT (gỡ về bản nháp).</summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class ChangeExamStatusRequestDto
{
    [Required, RegularExpression("^(PUBLISHED|DRAFT)$", ErrorMessage = "Status chỉ nhận PUBLISHED hoặc DRAFT")]
    public string Status { get; set; } = string.Empty;
}
