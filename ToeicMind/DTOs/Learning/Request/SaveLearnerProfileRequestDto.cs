using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ToeicMind.DTOs.Learning.Request;

/// <summary>
/// Lưu mục tiêu học của người học (CHG-007). Gửi đủ ba trường mỗi lần; null = bỏ trống trường đó.
/// TargetScore là điểm TOEIC tổng (10–990, bội số của 5); ExamDate là ngày thi dự kiến (yyyy-MM-dd, từ hôm nay trở đi); DailyMinutes là số phút học mỗi ngày (5–600).
/// </summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class SaveLearnerProfileRequestDto : IValidatableObject
{
    [Range(10, 990, ErrorMessage = "Điểm mục tiêu từ 10 đến 990")]
    public short? TargetScore { get; set; }
    public DateOnly? ExamDate { get; set; }
    [Range(5, 600, ErrorMessage = "Số phút học mỗi ngày từ 5 đến 600")]
    public short? DailyMinutes { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (TargetScore is { } target && target % 5 != 0)
            yield return new ValidationResult("Điểm TOEIC là bội số của 5", [nameof(TargetScore)]);
        // Cho phép lệch một ngày để người học ở múi giờ khác không bị chặn khi chọn "hôm nay".
        if (ExamDate is { } date && date < DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1)))
            yield return new ValidationResult("Ngày thi phải từ hôm nay trở đi", [nameof(ExamDate)]);
        if (ExamDate is { } far && far > DateOnly.FromDateTime(DateTime.UtcNow.AddYears(3)))
            yield return new ValidationResult("Ngày thi không quá 3 năm kể từ hôm nay", [nameof(ExamDate)]);
    }
}
