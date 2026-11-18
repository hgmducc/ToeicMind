using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ToeicMind.DTOs.Learning.Request;

/// <summary>
/// Gợi ý tự động bộ nhóm câu cho bài kiểm tra đầu vào (không lưu): số câu mong muốn mỗi Part. Máy chủ lấy trọn nhóm, trải đều các Level,
/// ưu tiên nhóm chưa có trong ExcludeGroupIds. Admin xem lại rồi lưu bằng API tạo/sửa.
/// </summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class GeneratePlacementRequestDto
{
    [Required, MinLength(1), MaxLength(7)]
    public List<PlacementPartQuotaDto> Parts { get; set; } = [];
    /// <summary>Giới hạn trong một đề (tùy chọn).</summary>
    [Range(1, int.MaxValue)]
    public int? ExamId { get; set; }
    [MaxLength(200)]
    public List<int> ExcludeGroupIds { get; set; } = [];
}

/// <summary>Số câu mong muốn của một Part (0–60).</summary>
public class PlacementPartQuotaDto
{
    [Range(1, 7)]
    public byte PartNo { get; set; }
    [Range(0, 60)]
    public int QuestionCount { get; set; }
}
