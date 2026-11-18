using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ToeicMind.DTOs.Learning.Request;

/// <summary>Bắt đầu một lần làm bài trong một đề. PartNos chỉ dùng khi Scope = PART (chọn một hoặc nhiều Part); TimeLimitSeconds (giây, 60–14400) chỉ dùng khi Mode = EXAM để tự đặt thời gian, bỏ trống thì dùng thời gian mặc định của phạm vi.</summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class StartAttemptRequestDto
{
    [Range(1, int.MaxValue)]
    public int ExamId { get; set; }
    [Required, RegularExpression("^(EXAM|PRACTICE)$", ErrorMessage = "Mode chỉ nhận EXAM hoặc PRACTICE")]
    public string Mode { get; set; } = string.Empty;
    [Required, RegularExpression("^(FULL|LISTENING|READING|PART)$", ErrorMessage = "Scope chỉ nhận FULL, LISTENING, READING hoặc PART")]
    public string Scope { get; set; } = string.Empty;
    public List<byte>? PartNos { get; set; } = [];
    [Range(60, 14400)]
    public int? TimeLimitSeconds { get; set; }
}
