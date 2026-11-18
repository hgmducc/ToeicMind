using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ToeicMind.DTOs.Learning.Request;

/// <summary>
/// Đáp án chọn cho một câu. OptionId null nghĩa là bỏ chọn (Luyện thi, hoặc Luyện tập khi Reveal = false).
/// Reveal (chỉ Luyện tập/ngân hàng, mặc định true): true = chấm ngay, trả đáp án + giải thích và khóa câu;
/// false = chỉ lưu lựa chọn (đổi/bỏ được), chưa chấm; câu được chấm khi gửi lại với Reveal = true hoặc khi nộp bài.
/// </summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class SaveAnswerRequestDto
{
    [Range(1, int.MaxValue)]
    public int? OptionId { get; set; }

    public bool Reveal { get; set; } = true;
}
