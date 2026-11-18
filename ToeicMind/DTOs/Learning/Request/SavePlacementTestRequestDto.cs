using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ToeicMind.DTOs.Learning.Request;

/// <summary>
/// Tạo/sửa bài kiểm tra đầu vào (Admin). GroupIds là các nhóm câu hỏi theo đúng thứ tự làm bài (trọn nhóm, lấy từ đề đã xuất bản).
/// IsActive = true: dùng bài này cho người học và tự tắt bài đang dùng trước đó.
/// </summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class SavePlacementTestRequestDto : IValidatableObject
{
    [Required(ErrorMessage = "Cần nhập tên bài kiểm tra"), MaxLength(150)]
    public string Title { get; set; } = string.Empty;
    [MaxLength(1000)]
    public string? Description { get; set; }
    [Range(60, 14400, ErrorMessage = "Thời gian làm bài từ 1 đến 240 phút")]
    public int TimeLimitSeconds { get; set; } = 1800;
    public bool IsActive { get; set; }
    [Required, MinLength(1, ErrorMessage = "Cần chọn ít nhất một nhóm câu hỏi"), MaxLength(200, ErrorMessage = "Tối đa 200 nhóm câu hỏi")]
    public List<int> GroupIds { get; set; } = [];

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(Title)) yield return new ValidationResult("Cần nhập tên bài kiểm tra", [nameof(Title)]);
        if (GroupIds.Any(id => id <= 0) || GroupIds.Distinct().Count() != GroupIds.Count)
            yield return new ValidationResult("Danh sách nhóm câu hỏi bị trùng hoặc không hợp lệ", [nameof(GroupIds)]);
    }
}
